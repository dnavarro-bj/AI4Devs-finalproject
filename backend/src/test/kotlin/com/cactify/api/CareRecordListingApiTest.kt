package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/**
 * Escenarios de "Listado de lecturas de una planta", "Paginación del listado de lecturas" y la
 * parte de listado de "Lectura sobre una planta inexistente".
 */
class CareRecordListingApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `readings come back newest first`() {
    val plantId = createPlant("Bola con historial")
    createReading(plantId, 1, "2026-08-01T10:00:00Z")
    createReading(plantId, 2, "2026-08-03T10:00:00Z")
    createReading(plantId, 3, "2026-08-02T10:00:00Z")

    mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].humidity").value(2))
      .andExpect(jsonPath("$.content[1].humidity").value(3))
      .andExpect(jsonPath("$.content[2].humidity").value(1))
  }

  @Test
  fun `a plant with no readings answers an empty page`() {
    val plantId = createPlant("Bola sin historial")

    mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `readings sharing a timestamp each appear exactly once across the pages`() {
    val plantId = createPlant("Bola con lecturas simultaneas")
    val sameInstant = "2026-08-01T10:00:00Z"
    repeat(5) { createReading(plantId, it, sameInstant) }

    val seen = mutableListOf<String>()
    for (page in 0..2) {
      val body = mockMvc.perform(get("/plants/$plantId/care-records").param("page", "$page").param("size", "2"))
        .andExpect(status().isOk)
        .andReturn().response.contentAsString
      objectMapper.readTree(body).get("content").forEach { seen += it.get("id").asText() }
    }

    assertEquals(5, seen.size, "cada lectura debe aparecer una vez al recorrer las páginas")
    assertEquals(5, seen.toSet().size, "ninguna lectura debe repetirse entre páginas")
  }

  @Test
  fun `the listing is paginated by default with the configured page size`() {
    val plantId = createPlant("Bola paginada por defecto")
    createReading(plantId, 1, "2026-08-01T10:00:00Z")

    mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content").isArray)
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(25))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.totalPages").value(1))
  }

  @Test
  fun `5 readings with page size 2 answer 2 elements, 5 total and 3 pages`() {
    val plantId = createPlant("Bola con cinco lecturas")
    repeat(5) { createReading(plantId, it, "2026-08-0${it + 1}T10:00:00Z") }

    mockMvc.perform(get("/plants/$plantId/care-records").param("page", "0").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(2))
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
  }

  @Test
  fun `a page beyond the end answers empty content and the real total`() {
    val plantId = createPlant("Bola mas alla del final")
    repeat(3) { createReading(plantId, it, "2026-08-0${it + 1}T10:00:00Z") }

    mockMvc.perform(get("/plants/$plantId/care-records").param("page", "9").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `the total counts only the readings of the plant asked for`() {
    val mine = createPlant("Bola contada")
    val other = createPlant("Bola no contada")
    repeat(2) { createReading(mine, it, "2026-08-0${it + 1}T10:00:00Z") }
    repeat(3) { createReading(other, it, "2026-08-0${it + 1}T10:00:00Z") }

    mockMvc.perform(get("/plants/$mine/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `listing the readings of a nonexistent plant answers 404, not an empty page`() {
    mockMvc.perform(get("/plants/999999999/care-records"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  @Test
  fun `a malformed plant identifier answers 400`() {
    mockMvc.perform(get("/plants/no-soy-un-id/care-records"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  private fun createPlant(nickname: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun createReading(plantId: String, humidity: Int, recordedAt: String) {
    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to humidity, "recordedAt" to recordedAt)),
    ).andExpect(status().isCreated)
  }
}

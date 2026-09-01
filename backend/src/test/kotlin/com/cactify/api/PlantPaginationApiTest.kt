package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de "Paginación del listado de inventario". */
class PlantPaginationApiTest : AbstractApiIntegrationTest() {

  private val speciesId = "200001"
  private val locationId = "300001"
  private val globular = "400001"

  @Test
  fun `the listing is paginated by default with the configured page size`() {
    clearPlants()
    repeat(3) { plant("Bola $it") }

    mockMvc.perform(get("/plants"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(25))
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.totalPages").value(1))
  }

  @Test
  fun `5 plants with page size 2 answer 2 elements, 5 total and 3 pages`() {
    clearPlants()
    repeat(5) { plant("Bola $it") }

    mockMvc.perform(get("/plants").param("page", "0").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(2))
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
      .andExpect(jsonPath("$.pageSize").value(2))
  }

  @Test
  fun `the third page of 5 plants with size 2 holds the remaining one`() {
    clearPlants()
    repeat(5) { plant("Bola $it") }

    mockMvc.perform(get("/plants").param("page", "2").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(1))
      .andExpect(jsonPath("$.pageNumber").value(2))
      .andExpect(jsonPath("$.totalElements").value(5))
  }

  @Test
  fun `a page beyond the end answers 200 with empty content and the real total`() {
    clearPlants()
    repeat(3) { plant("Bola $it") }

    mockMvc.perform(get("/plants").param("page", "9").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `a page size above the maximum is served with the maximum`() {
    mockMvc.perform(get("/plants").param("size", "1000"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.pageSize").value(500))
  }

  @Test
  fun `pagination combines with a tag filter`() {
    clearPlants()
    repeat(4) { tagPlant(plant("Bola $it"), globular) }
    plant("Bola sin tag")

    mockMvc.perform(get("/plants").param("tag", globular).param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(2))
      .andExpect(jsonPath("$.totalElements").value(4))
      .andExpect(jsonPath("$.totalPages").value(2))
  }

  private fun plant(nickname: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to speciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun tagPlant(plantId: String, vararg tagIds: String) {
    mockMvc.perform(
      put("/plants/$plantId/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("tagIds" to tagIds.toList()))),
    ).andExpect(status().isOk)
  }
}

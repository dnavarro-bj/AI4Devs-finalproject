package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/**
 * Escenarios de "Validación de rangos de una lectura" y de "Distinción entre riego no medido y
 * riego nulo".
 */
class CareRecordValidationApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `humidity below zero is rejected with 400 and nothing is recorded`() = rejects(mapOf("humidity" to -5))

  @Test
  fun `soil pH beyond the scale is rejected with 400`() = rejects(mapOf("soilPh" to "15.0"))

  @Test
  fun `more light hours than a day is rejected with 400`() = rejects(mapOf("lightHours" to 25))

  @Test
  fun `a negative water amount is rejected with 400`() = rejects(mapOf("waterAmountMl" to -1))

  @Test
  fun `a water amount of zero is kept as zero, not as empty`() {
    val plantId = createPlant("Bola regada con cero")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("waterAmountMl" to 0)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.waterAmountMl").value(0))
  }

  @Test
  fun `an unrecorded water amount stays empty, not zero`() {
    val plantId = createPlant("Bola sin riego anotado")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.waterAmountMl").doesNotExist())
  }

  private fun rejects(body: Map<String, Any?>) {
    val plantId = createPlant("Bola fuera de rango")
    val before = countCareRecords()

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(body)),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.error").value("Bad Request"))
      .andExpect(jsonPath("$.message").isNotEmpty)

    assertEquals(before, countCareRecords(), "no debía registrarse ninguna lectura")
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

  private fun countCareRecords(): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM care_record", Int::class.java) ?: 0
}

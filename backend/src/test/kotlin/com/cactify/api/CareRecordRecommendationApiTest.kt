package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import kotlin.test.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de "Recomendación de IA asociada a cada lectura" y el recorte de precisión de la
 * fecha (decisión 2c del design).
 */
class CareRecordRecommendationApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `readings without a recommendation come back with the field absent`() {
    val plantId = createPlant("Bola sin recomendaciones")
    createReading(plantId, "2026-08-01T10:00:00Z")

    mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].recommendation").doesNotExist())
  }

  @Test
  fun `a reading with a persisted recommendation comes back with it`() {
    val plantId = createPlant("Bola con recomendacion")
    val recordId = createReading(plantId, "2026-08-01T10:00:00Z")
    val record = entityManager.find(CareRecord::class.java, CareRecordId.from(recordId))
    entityManager.persist(
      AIRecommendation(
        careRecord = record,
        riskLevel = RiskLevel.High,
        recommendationText = "Riega ya",
        recommendedAction = "Riega hasta drenaje",
        priority = Priority.Immediate,
      ),
    )
    flushPersistenceContext()

    mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].recommendation.riskLevel").value("high"))
      .andExpect(jsonPath("$.content[0].recommendation.recommendationText").value("Riega ya"))
      .andExpect(jsonPath("$.content[0].recommendation.id").isNotEmpty)
  }

  @Test
  fun `listing the readings creates no recommendation`() {
    val plantId = createPlant("Bola que no genera nada")
    createReading(plantId, "2026-08-01T10:00:00Z")
    val before = countRecommendations()

    mockMvc.perform(get("/plants/$plantId/care-records")).andExpect(status().isOk)
    mockMvc.perform(get("/plants/$plantId/care-records")).andExpect(status().isOk)

    assertEquals(before, countRecommendations(), "consultar el listado no debe generar nada")
  }

  @Test
  fun `the reading date survives the round trip at the precision the column stores`() {
    val plantId = createPlant("Bola con nanosegundos")
    val response = mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "recordedAt" to "2026-08-01T10:00:00.479235925Z")),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    val created = objectMapper.readTree(response).get("recordedAt").asText()

    val listing = mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andReturn().response.contentAsString
    val listed = objectMapper.readTree(listing).get("content").first().get("recordedAt").asText()

    assertEquals(created, listed, "el 201 y el listado deben devolver la misma cadena")
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

  private fun createReading(plantId: String, recordedAt: String): String {
    val response = mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "recordedAt" to recordedAt)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun countRecommendations(): Int {
    flushPersistenceContext()
    return jdbcTemplate.queryForObject("SELECT count(*) FROM ai_recommendation", Int::class.java) ?: 0
  }
}

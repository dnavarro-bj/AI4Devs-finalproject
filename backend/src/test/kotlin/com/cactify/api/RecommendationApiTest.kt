package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.FakeCareAdvisor
import com.cactify.FakeCareAdvisorConfiguration
import com.cactify.application.ports.Advice
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/**
 * Escenarios de "Generación de la recomendación de una lectura" y de "Referencias inválidas en la
 * ruta". El proveedor está sustituido por el doble: la suite no toca la red.
 */
@Import(FakeCareAdvisorConfiguration::class)
class RecommendationApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"   // humedad 10-30, temperatura 10-35, luz 6-10
  private val seededLocationId = "300001"

  @Autowired
  lateinit var advisor: FakeCareAdvisor

  @BeforeEach
  fun resetAdvisor() {
    advisor.reset()
    advisor.advice = Advice(RiskLevel.High, "Humedad muy baja", "Riega hoy mismo", Priority.Immediate)
  }

  // --- Generación ---

  @Test
  fun `generating a recommendation answers 201 with its four data`() {
    val (plantId, recordId) = plantWithReading(humidity = 2)

    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.careRecordId").value(recordId))
      .andExpect(jsonPath("$.riskLevel").value("high"))
      .andExpect(jsonPath("$.explanation").value("Humedad muy baja"))
      .andExpect(jsonPath("$.recommendedAction").value("Riega hoy mismo"))
      .andExpect(jsonPath("$.priority").value("immediate"))
  }

  @Test
  fun `the recommendation stays associated with its reading`() {
    val (plantId, recordId) = plantWithReading(humidity = 2)
    val generated = mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    val id = objectMapper.readTree(generated).get("id").asText()

    mockMvc.perform(get("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(id))
  }

  @Test
  fun `a reading well outside its species range is not rated at the lowest risk`() {
    val (plantId, recordId) = plantWithReading(humidity = 2)

    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.riskLevel").value(org.hamcrest.Matchers.not("low")))

    val deviations = advisor.received.single().deviations
    assertEquals(1, deviations.size, "la humedad 2 se sale del rango 10-30 de la especie")
    assertEquals("humidity", deviations.single().measurement)
  }

  @Test
  fun `a plant with no watering at all still gets a recommendation`() {
    val (plantId, recordId) = plantWithReading(humidity = 2)

    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isCreated)

    assertEquals(null, advisor.received.single().lastWatering, "no consta ningún riego")
  }

  // --- Referencias inválidas en la ruta ---

  @Test
  fun `a nonexistent plant answers 404`() {
    val (_, recordId) = plantWithReading(humidity = 20)

    mockMvc.perform(post("/plants/999999999/care-records/$recordId/recommendation"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  @Test
  fun `a nonexistent reading answers 404`() {
    val (plantId, _) = plantWithReading(humidity = 20)

    mockMvc.perform(post("/plants/$plantId/care-records/999999999/recommendation"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  @Test
  fun `a reading belonging to another plant answers 404`() {
    val (_, recordId) = plantWithReading(humidity = 20)
    val (otherPlantId, _) = plantWithReading(humidity = 20)

    mockMvc.perform(post("/plants/$otherPlantId/care-records/$recordId/recommendation"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  @Test
  fun `a malformed identifier answers 400`() {
    val (plantId, _) = plantWithReading(humidity = 20)

    mockMvc.perform(post("/plants/$plantId/care-records/no-soy-un-id/recommendation"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  private fun plantWithReading(humidity: Int): Pair<String, String> {
    val plantResponse = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola analizada", "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    val plantId = objectMapper.readTree(plantResponse).get("id").asText()

    val readingResponse = mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to humidity)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return plantId to objectMapper.readTree(readingResponse).get("id").asText()
  }
}

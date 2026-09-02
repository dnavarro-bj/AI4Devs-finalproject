package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.FakeCareAdvisor
import com.cactify.FakeCareAdvisorConfiguration
import com.cactify.application.AIProviderException
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
 * Escenarios de "Una recomendación por lectura", "Consulta de la recomendación de una lectura",
 * "Fallo del proveedor de IA" y "Vocabulario del nivel de riesgo y de la prioridad".
 */
@Import(FakeCareAdvisorConfiguration::class)
class RecommendationUniquenessApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Autowired
  lateinit var advisor: FakeCareAdvisor

  @BeforeEach
  fun resetAdvisor() {
    advisor.reset()
    advisor.advice = Advice(RiskLevel.Medium, "Humedad justa", "Vigila el sustrato", Priority.Soon)
  }

  // --- Una recomendación por lectura ---

  @Test
  fun `a second request answers 200 with the existing one and does not call the provider again`() {
    val (plantId, recordId) = plantWithReading()
    val first = mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    val firstId = objectMapper.readTree(first).get("id").asText()

    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(firstId))

    assertEquals(1, advisor.callCount, "la segunda solicitud no debe consultar al proveedor")
  }

  @Test
  fun `the reading keeps exactly one recommendation after repeated requests`() {
    val (plantId, recordId) = plantWithReading()
    repeat(3) {
      mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
        .andExpect(status().is2xxSuccessful)
    }
    flushPersistenceContext()

    val rows = jdbcTemplate.queryForObject(
      "SELECT count(*) FROM ai_recommendation WHERE care_record_id = ?",
      Int::class.java,
      recordId.toLong(),
    )
    assertEquals(1, rows)
  }

  // --- Consulta ---

  @Test
  fun `reading with a recommendation answers 200 with its four data`() {
    val (plantId, recordId) = plantWithReading()
    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation")).andExpect(status().isCreated)

    mockMvc.perform(get("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.riskLevel").value("medium"))
      .andExpect(jsonPath("$.explanation").value("Humedad justa"))
      .andExpect(jsonPath("$.recommendedAction").value("Vigila el sustrato"))
      .andExpect(jsonPath("$.priority").value("soon"))
  }

  @Test
  fun `reading without a recommendation answers 404 and none is created by asking`() {
    val (plantId, recordId) = plantWithReading()

    mockMvc.perform(get("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))

    assertEquals(0, advisor.callCount, "consultar no debe generar")
    flushPersistenceContext()
    assertEquals(
      0,
      jdbcTemplate.queryForObject(
        "SELECT count(*) FROM ai_recommendation WHERE care_record_id = ?", Int::class.java, recordId.toLong(),
      ),
    )
  }

  // --- Fallo del proveedor ---

  @Test
  fun `a provider failure answers 5xx with the uniform body and persists nothing`() {
    val (plantId, recordId) = plantWithReading()
    advisor.failure = { throw AIProviderException("El proveedor de análisis no respondió") }

    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().is5xxServerError)
      .andExpect(jsonPath("$.status").value(502))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").isNotEmpty)

    flushPersistenceContext()
    assertEquals(
      0,
      jdbcTemplate.queryForObject(
        "SELECT count(*) FROM ai_recommendation WHERE care_record_id = ?", Int::class.java, recordId.toLong(),
      ),
    )
  }

  @Test
  fun `an uninterpretable response is not blamed on the client as a 400`() {
    val (plantId, recordId) = plantWithReading()
    // Lo que ocurriría si el adaptador dejase escapar el fallo de parseo de un nivel desconocido.
    advisor.failure = {
      throw AIProviderException(
        "El proveedor devolvió un nivel de riesgo desconocido",
        IllegalArgumentException("altisimo no es un nivel de riesgo válido"),
      )
    }

    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isBadGateway)
      .andExpect(jsonPath("$.status").value(502))
  }

  @Test
  fun `after a failure the reading still works and can be retried`() {
    val (plantId, recordId) = plantWithReading()
    advisor.failure = { throw AIProviderException("caído") }
    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isBadGateway)

    mockMvc.perform(get("/plants/$plantId/care-records")).andExpect(status().isOk)

    advisor.failure = null
    mockMvc.perform(post("/plants/$plantId/care-records/$recordId/recommendation"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.riskLevel").value("medium"))
  }

  private fun plantWithReading(): Pair<String, String> {
    val plantResponse = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    val plantId = objectMapper.readTree(plantResponse).get("id").asText()

    val readingResponse = mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 20)),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return plantId to objectMapper.readTree(readingResponse).get("id").asText()
  }
}

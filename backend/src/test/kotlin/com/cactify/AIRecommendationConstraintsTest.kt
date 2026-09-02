package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertFailsWith

/**
 * Escenarios de "Restricciones de dominio de las recomendaciones de IA": la red de base de datos
 * (ADR-002) bajo los enumerados y bajo la cardinalidad que declara el diagrama del modelo.
 *
 * El `assertFailsWith` va como última sentencia de cada test: la violación aborta la transacción.
 */
class AIRecommendationConstraintsTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  private fun insertCareRecord(): Long {
    val plantId = System.nanoTime()
    jdbcTemplate.update(
      "INSERT INTO plant (id, nickname, location_id, species_id) VALUES (?, 'Bola', 300001, 200001)",
      plantId,
    )
    val recordId = System.nanoTime() + 1
    jdbcTemplate.update(
      "INSERT INTO care_record (id, plant_id, humidity, recorded_at) VALUES (?, ?, 35, now())",
      recordId, plantId,
    )
    return recordId
  }

  private fun insertRecommendation(careRecordId: Long, riskLevel: String = "high", priority: String = "soon") =
    jdbcTemplate.update(
      """
      INSERT INTO ai_recommendation (id, care_record_id, risk_level, recommendation_text, recommended_action, priority)
      VALUES (?, ?, ?, 'Explicación', 'Riega ya', ?)
      """.trimIndent(),
      System.nanoTime(), careRecordId, riskLevel, priority,
    )

  @Test
  fun `a risk level outside the allowed set is rejected`() {
    val careRecordId = insertCareRecord()

    assertFailsWith<DataIntegrityViolationException> {
      insertRecommendation(careRecordId, riskLevel = "altisimo")
    }
  }

  @Test
  fun `a priority outside the allowed set is rejected`() {
    val careRecordId = insertCareRecord()

    assertFailsWith<DataIntegrityViolationException> {
      insertRecommendation(careRecordId, priority = "urgentisimo")
    }
  }

  @Test
  fun `a second recommendation for the same reading is rejected`() {
    val careRecordId = insertCareRecord()
    insertRecommendation(careRecordId)

    assertFailsWith<DataIntegrityViolationException> { insertRecommendation(careRecordId) }
  }

  @Test
  fun `recommendations for different readings are both accepted`() {
    insertRecommendation(insertCareRecord())
    insertRecommendation(insertCareRecord())
  }
}

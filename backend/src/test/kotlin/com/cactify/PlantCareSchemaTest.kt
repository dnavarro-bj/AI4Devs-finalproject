package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.support.TransactionTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

/** Escenarios de «Cuidados propios del ejemplar en el esquema»: las reglas viven en la base (ADR-002). */
class PlantCareSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  private var sequence = 960_000L

  private fun assertRejected(message: String, insert: () -> Unit) {
    val isolated = TransactionTemplate(transactionManager).apply {
      propagationBehavior = TransactionDefinition.PROPAGATION_REQUIRES_NEW
    }
    assertFailsWith<DataIntegrityViolationException>(message) { isolated.execute { insert() } }
  }

  /** Inserta una planta con los cuidados propios que se indiquen; el resto, nulo. */
  private fun insertPlant(vararg care: Pair<String, Any?>): Long {
    val id = ++sequence
    val columns = listOf("id", "code", "nickname", "location_id", "species_id") + care.map { it.first }
    val values = listOf<Any?>(id, "TEST-C-$id", "Bola", 300001L, 200001L) + care.map { it.second }
    jdbc.update(
      "INSERT INTO plant (${columns.joinToString()}) VALUES (${columns.joinToString { "?" }})",
      *values.toTypedArray(),
    )
    return id
  }

  @Test
  fun `a plant without own care is accepted and every own value is null`() {
    val id = insertPlant()

    val row = jdbc.queryForMap("SELECT * FROM plant WHERE id = ?", id)
    for (column in OWN_COLUMNS) assertNull(row[column], "$column debía ser nulo")
  }

  @Test
  fun `a single own value is accepted and the rest stays null`() {
    val id = insertPlant("care_max_temperature" to 28)

    val row = jdbc.queryForMap("SELECT * FROM plant WHERE id = ?", id)
    assertEquals(28, row["care_max_temperature"])
    assertNull(row["care_min_temperature"])
    assertNull(row["care_watering_guideline"])
  }

  @Test
  fun `all the own values are accepted together`() {
    insertPlant(
      "care_min_humidity" to 20, "care_max_humidity" to 40,
      "care_min_temperature" to 12, "care_max_temperature" to 30,
      "care_min_light_hours" to 4, "care_max_light_hours" to 8,
      "care_watering_guideline" to "cada 5 dias", "care_soil_mix_id" to 100002L,
    )
  }

  @Test
  fun `a humidity outside 0 to 100 is rejected`() {
    assertRejected("101") { insertPlant("care_max_humidity" to 101) }
    assertRejected("-1") { insertPlant("care_min_humidity" to -1) }
    assertRejected("min 101") { insertPlant("care_min_humidity" to 101) }
  }

  @Test
  fun `light hours outside 0 to 24 are rejected`() {
    assertRejected("25") { insertPlant("care_max_light_hours" to 25) }
    assertRejected("-1") { insertPlant("care_min_light_hours" to -1) }
  }

  @Test
  fun `the bounds themselves are accepted`() {
    insertPlant("care_min_humidity" to 0, "care_max_humidity" to 100, "care_min_light_hours" to 0, "care_max_light_hours" to 24)
  }

  @Test
  fun `a soil mix that does not exist is rejected`() {
    assertRejected("mezcla inexistente") { insertPlant("care_soil_mix_id" to 999_999_999L) }
  }

  private companion object {
    val OWN_COLUMNS = listOf(
      "care_min_humidity", "care_max_humidity", "care_min_temperature", "care_max_temperature",
      "care_min_light_hours", "care_max_light_hours", "care_watering_guideline", "care_soil_mix_id",
    )
  }
}

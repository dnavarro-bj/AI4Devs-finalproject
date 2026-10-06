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

/** Escenarios de «Códigos de inventario en el esquema»: las reglas viven en la base (ADR-002). */
class InventoryCodesSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  /**
   * Una fila rechazada aborta la transacción de PostgreSQL: para probar varios valores inválidos en
   * un mismo test, cada intento va en su propia transacción y no contamina a los demás.
   */
  private fun assertRejected(message: String, insert: () -> Unit) {
    val isolated = TransactionTemplate(transactionManager).apply {
      propagationBehavior = TransactionDefinition.PROPAGATION_REQUIRES_NEW
    }
    assertFailsWith<DataIntegrityViolationException>(message) { isolated.execute { insert() } }
  }

  private fun insertSpecies(id: Long, code: String?, nextSequence: Int = 1) = jdbc.update(
    """
    INSERT INTO species (id, code, next_sequence, scientific_name, common_name, min_humidity, max_humidity,
      min_temperature, max_temperature, min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
    VALUES (?, ?, ?, ?, 'Común', 10, 30, 10, 35, 6, 10, 'cada 10 dias', 100001)
    """.trimIndent(),
    id, code, nextSequence, "Especie de prueba $id",
  )

  private fun insertPlant(id: Long, code: String?) = jdbc.update(
    "INSERT INTO plant (id, code, nickname, location_id, species_id) VALUES (?, ?, 'Bola', 300001, 200001)",
    id, code,
  )

  @Test
  fun `a duplicate species code is rejected`() {
    insertSpecies(990001, "CAT-DUP")

    assertFailsWith<DataIntegrityViolationException> { insertSpecies(990002, "CAT-DUP") }
  }

  @Test
  fun `a duplicate plant code is rejected`() {
    insertPlant(991001, "CAT-DUP-01")

    assertFailsWith<DataIntegrityViolationException> { insertPlant(991002, "CAT-DUP-01") }
  }

  @Test
  fun `a species without a code is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertSpecies(990003, null) }
  }

  @Test
  fun `a plant without a code is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertPlant(991003, null) }
  }

  @Test
  fun `a species code with an invalid format is rejected`() {
    for (invalid in listOf("cat-gruss", "CAT GRUSS", "CAT_GRUSS", "-CAT", "CAT-", "CAT--X", "A".repeat(21))) {
      assertRejected("«$invalid» debía rechazarse") { insertSpecies(990100, invalid) }
    }
  }

  @Test
  fun `a plant code with an invalid format is rejected`() {
    for (invalid in listOf("cat-gruss-01", "CAT GRUSS 01", "CAT-GRUSS-", "A".repeat(31))) {
      assertRejected("«$invalid» debía rechazarse") { insertPlant(991100, invalid) }
    }
  }

  @Test
  fun `a species counter below 1 is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertSpecies(990004, "CAT-CERO", nextSequence = 0) }
  }

  @Test
  fun `the seeded species already carry a code`() {
    val codes = jdbc.queryForList("SELECT code FROM species WHERE id IN (200001, 200002, 200003)", String::class.java)

    assertEquals(3, codes.size)
    assertEquals(3, codes.toSet().size, "los códigos de las semillas deben ser distintos")
    assertEquals(
      "CAT-GRUSS",
      jdbc.queryForObject("SELECT code FROM species WHERE id = 200001", String::class.java),
    )
  }
}

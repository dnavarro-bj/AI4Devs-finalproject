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

/** Escenarios de «Perfil y estado del ejemplar en el esquema»: las reglas viven en la base (ADR-002). */
class PlantProfileSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  private var sequence = 970_000L

  /** Una fila rechazada aborta la transacción: cada intento va en la suya (ver `InventoryCodesSchemaTest`). */
  private fun assertRejected(message: String, insert: () -> Unit) {
    val isolated = TransactionTemplate(transactionManager).apply {
      propagationBehavior = TransactionDefinition.PROPAGATION_REQUIRES_NEW
    }
    assertFailsWith<DataIntegrityViolationException>(message) { isolated.execute { insert() } }
  }

  private fun insertPlant(
    status: String? = "activa",
    year: Int? = null,
    month: Int? = null,
    origin: String? = null,
    id: Long = ++sequence,
  ) = jdbc.update(
    """
    INSERT INTO plant (id, code, nickname, location_id, species_id, status, germination_year, germination_month, origin)
    VALUES (?, ?, 'Bola', 300001, 200001, ?, ?, ?, ?)
    """.trimIndent(),
    id, "TEST-P-$id", status, year, month, origin,
  )

  private fun insertChange(plantId: Long, from: String, to: String) = jdbc.update(
    "INSERT INTO plant_status_change (id, plant_id, from_status, to_status, occurred_at) VALUES (?, ?, ?, ?, now())",
    ++sequence, plantId, from, to,
  )

  @Test
  fun `an invalid status is rejected`() {
    assertRejected("«fantasma» debía rechazarse") { insertPlant(status = "fantasma") }
  }

  @Test
  fun `a plant without a status is rejected`() {
    assertRejected("un estado nulo debía rechazarse") { insertPlant(status = null) }
  }

  @Test
  fun `the seven statuses are accepted`() {
    for (status in listOf("activa", "cuarentena", "enferma", "cedida", "vendida", "muerta", "perdida")) {
      insertPlant(status = status)
    }
  }

  @Test
  fun `a germination month without a year is rejected`() {
    assertRejected("mes sin año") { insertPlant(year = null, month = 4) }
  }

  @Test
  fun `a germination month out of range is rejected`() {
    assertRejected("mes 0") { insertPlant(year = 2021, month = 0) }
    assertRejected("mes 13") { insertPlant(year = 2021, month = 13) }
  }

  @Test
  fun `an implausible germination year is rejected`() {
    assertRejected("año 1899") { insertPlant(year = 1899) }
    assertRejected("año 2101") { insertPlant(year = 2101) }
  }

  @Test
  fun `a year without a month is accepted`() {
    insertPlant(year = 2021, month = null)
  }

  @Test
  fun `a year with a month is accepted`() {
    insertPlant(year = 2021, month = 4)
  }

  @Test
  fun `an origin outside the closed list is rejected`() {
    assertRejected("«robado» debía rechazarse") { insertPlant(origin = "robado") }
  }

  @Test
  fun `the six origins are accepted`() {
    for (origin in listOf("vivero", "intercambio", "germinacion_propia", "compra", "regalo", "otro")) {
      insertPlant(origin = origin)
    }
  }

  @Test
  fun `a status change to the same status is rejected`() {
    val plant = ++sequence
    insertPlant(id = plant)

    assertRejected("de activa a activa") { insertChange(plant, "activa", "activa") }
  }

  @Test
  fun `a status change with an invalid status is rejected`() {
    val plant = ++sequence
    insertPlant(id = plant)

    assertRejected("destino inválido") { insertChange(plant, "activa", "fantasma") }
    assertRejected("origen inválido") { insertChange(plant, "fantasma", "activa") }
  }

  @Test
  fun `a valid status change is accepted and keeps its plant`() {
    val plant = ++sequence
    insertPlant(id = plant)

    insertChange(plant, "activa", "cuarentena")

    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM plant_status_change WHERE plant_id = ?", Int::class.java, plant))
  }

  @Test
  fun `a status change needs an existing plant`() {
    assertRejected("planta inexistente") { insertChange(1L, "activa", "cuarentena") }
  }
}

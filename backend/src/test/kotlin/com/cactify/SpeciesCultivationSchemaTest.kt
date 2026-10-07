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

/** Escenarios de «Ficha de cultivo de la especie en el esquema» y «Calendario anual de la especie en el esquema». */
class SpeciesCultivationSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  private var sequence = 970_000L

  private fun isolated() = TransactionTemplate(transactionManager).apply {
    propagationBehavior = TransactionDefinition.PROPAGATION_REQUIRES_NEW
  }

  private fun assertRejected(message: String, insert: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { isolated().execute { insert() } }
  }

  private fun insertSpecies(vararg extra: Pair<String, Any?>): Long {
    val id = ++sequence
    val columns = listOf("id", "code", "scientific_name", "common_name", "min_humidity", "max_humidity", "min_temperature", "max_temperature", "min_light_hours", "max_light_hours", "watering_guideline", "soil_mix_id", "next_sequence") + extra.map { it.first }
    val values = listOf<Any?>(id, "TEST-S$id", "Species $id", "Común", 10, 30, 10, 35, 6, 10, "x", 100001L, 1) + extra.map { it.second }
    jdbc.update("INSERT INTO species (${columns.joinToString()}) VALUES (${columns.joinToString { "?" }})", *values.toTypedArray())
    return id
  }

  private fun insertPeriod(speciesId: Long, type: String, start: Int, end: Int, intensity: String? = null): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO species_period (id, species_id, period_type, start_month, end_month, intensity) VALUES (?, ?, ?, ?, ?, ?)",
      id, speciesId, type, start, end, intensity,
    )
    return id
  }

  @Test
  fun `existing species are untouched and undefined`() {
    val row = jdbc.queryForMap("SELECT * FROM species WHERE id = 200001")

    assertEquals("Echinocactus grusonii", row["scientific_name"])
    for (column in listOf("description", "sun_exposure", "environment", "bloom_description", "bloom_color", "bloom_maturity", "bloom_typical_duration")) {
      assertNull(row[column], "$column debía quedar sin definir")
    }
  }

  @Test
  fun `a species with the whole cultivation data is accepted`() {
    val id = insertSpecies("sun_exposure" to "pleno_sol", "environment" to "exterior", "bloom_color" to "Amarillo")

    assertEquals("pleno_sol", jdbc.queryForObject("SELECT sun_exposure FROM species WHERE id = ?", String::class.java, id))
  }

  @Test
  fun `an exposure outside the vocabulary is rejected`() {
    assertRejected("radiante") { insertSpecies("sun_exposure" to "radiante") }
  }

  @Test
  fun `seasonal is not an environment`() {
    assertRejected("estacional") { insertSpecies("environment" to "estacional") }
  }

  @Test
  fun `a period crossing the year is accepted`() {
    val species = insertSpecies()
    insertPeriod(species, "reposo", 11, 2)

    val row = jdbc.queryForMap("SELECT start_month, end_month FROM species_period WHERE species_id = ?", species)
    assertEquals(11, row["start_month"])
    assertEquals(2, row["end_month"])
  }

  @Test
  fun `months outside 1 to 12 are rejected`() {
    val species = insertSpecies()
    assertRejected("inicio 13") { insertPeriod(species, "crecimiento", 13, 2) }
    assertRejected("fin 0") { insertPeriod(species, "crecimiento", 1, 0) }
  }

  @Test
  fun `the growth peak is a period type`() {
    val species = insertSpecies()
    insertPeriod(species, "crecimiento", 3, 10)
    insertPeriod(species, "crecimiento_maximo", 5, 7)
  }

  @Test
  fun `an unknown period type is rejected`() {
    val species = insertSpecies()
    assertRejected("transicion") { insertPeriod(species, "transicion", 1, 2) }
  }

  @Test
  fun `intensity belongs to watering only`() {
    val species = insertSpecies()
    insertPeriod(species, "riego", 3, 5, "moderado")
    assertRejected("crecimiento con intensidad") { insertPeriod(species, "crecimiento", 3, 5, "moderado") }
    assertRejected("riego sin intensidad") { insertPeriod(species, "riego", 3, 5, null) }
    assertRejected("intensidad desconocida") { insertPeriod(species, "riego", 3, 5, "torrencial") }
  }

  @Test
  fun `removing a species removes its periods`() {
    val species = insertSpecies()
    insertPeriod(species, "crecimiento", 3, 10)
    insertPeriod(species, "floracion", 5, 7)

    jdbc.update("DELETE FROM species WHERE id = ?", species)

    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM species_period WHERE species_id = ?", Int::class.java, species))
  }
}

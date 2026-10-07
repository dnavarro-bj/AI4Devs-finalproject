package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios de «Espina de eventos y satélites en el esquema» (ADR-002). */
class PlantTimelineSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 970_000L

  /** Una fila rechazada aborta la transacción: cada test provoca un solo rechazo y es lo último que hace. */
  private fun assertRejected(message: String, insert: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { insert() }
  }

  private fun plantId(): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, ?, 'Planta', 200001, 300001)",
      id, "TEST-T-$id",
    )
    return id
  }

  private fun event(plant: Long, type: String): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, ?, now())",
      id, plant, type,
    )
    return id
  }

  private fun comment(plant: Long, text: String = "Marca en el lado oeste"): Long {
    val id = event(plant, "comentario")
    jdbc.update("INSERT INTO plant_comment (id, text) VALUES (?, ?)", id, text)
    return id
  }

  private fun intervention(plant: Long, type: String, product: String? = null, pot: String? = null, mix: Long? = null): Long {
    val id = event(plant, "intervencion")
    jdbc.update(
      "INSERT INTO plant_intervention (id, intervention_type, product, pot_size, soil_mix_id) VALUES (?, ?, ?, ?, ?)",
      id, type, product, pot, mix,
    )
    return id
  }

  private fun bloom(plant: Long, status: String, start: String = "2026-05-01", end: String? = null, flowers: Int? = null): Long {
    val id = event(plant, "floracion")
    jdbc.update(
      "INSERT INTO plant_bloom (id, started_on, ended_on, bloom_status, flower_count) VALUES (?, ?::date, ?::date, ?, ?)",
      id, start, end, status, flowers,
    )
    return id
  }

  private fun count(table: String): Long = jdbc.queryForObject("SELECT count(*) FROM $table", Long::class.java)!!

  @Test
  fun `one event of each class is accepted`() {
    val plant = plantId()
    comment(plant)
    intervention(plant, "trasplante", pot = "12 cm")
    bloom(plant, "en_flor")

    assertEquals(3L, count("plant_event"))
  }

  @Test
  fun `an unknown event type is rejected`() {
    val plant = plantId()
    assertRejected("alerta no es un tipo de evento") { event(plant, "alerta") }
  }

  @Test
  fun `a blank comment is rejected`() {
    val plant = plantId()
    assertRejected("el texto en blanco") { comment(plant, "   ") }
  }

  @Test
  fun `an unknown intervention type is rejected`() {
    val plant = plantId()
    assertRejected("riego no es una intervención") { intervention(plant, "riego") }
  }

  @Test
  fun `each intervention type admits only its own data`() {
    val plant = plantId()
    intervention(plant, "trasplante", pot = "12 cm")
    intervention(plant, "sustrato", mix = 100001)
    intervention(plant, "tratamiento", product = "Jabón potásico")
    intervention(plant, "fertilizacion", product = "NPK")
    intervention(plant, "poda")
    intervention(plant, "revision")

    assertEquals(6L, count("plant_intervention"))
  }

  @Test
  fun `a pruning with a pot size is rejected`() {
    val plant = plantId()
    assertRejected("la maceta es del trasplante") { intervention(plant, "poda", pot = "12 cm") }
  }

  @Test
  fun `a transplant with a product is rejected`() {
    val plant = plantId()
    assertRejected("el producto no es del trasplante") { intervention(plant, "trasplante", product = "NPK") }
  }

  @Test
  fun `a substrate change with a missing mix is rejected`() {
    val plant = plantId()
    assertRejected("la mezcla no existe") { intervention(plant, "sustrato", mix = 1) }
  }

  @Test
  fun `an open and a finished bloom are accepted`() {
    val plant = plantId()
    bloom(plant, "boton")
    bloom(plant, "en_flor", flowers = 3)
    bloom(plant, "finalizada", start = "2026-05-01", end = "2026-05-10", flowers = 0)

    assertEquals(3L, count("plant_bloom"))
  }

  @Test
  fun `a bloom ending before it starts is rejected`() {
    val plant = plantId()
    assertRejected("fin anterior al inicio") { bloom(plant, "finalizada", start = "2026-05-10", end = "2026-05-01") }
  }

  @Test
  fun `a finished bloom without an end is rejected`() {
    val plant = plantId()
    assertRejected("finalizada exige fin") { bloom(plant, "finalizada") }
  }

  @Test
  fun `an open bloom with an end is rejected`() {
    val plant = plantId()
    assertRejected("abierta no admite fin") { bloom(plant, "en_flor", end = "2026-05-10") }
  }

  @Test
  fun `a negative flower count is rejected`() {
    val plant = plantId()
    assertRejected("flores negativas") { bloom(plant, "en_flor", flowers = -1) }
  }

  @Test
  fun `removing an event removes its satellite`() {
    val plant = plantId()
    val c = comment(plant)
    val i = intervention(plant, "poda")
    val b = bloom(plant, "en_flor")

    listOf(c, i, b).forEach { jdbc.update("DELETE FROM plant_event WHERE id = ?", it) }

    assertEquals(0L, count("plant_comment") + count("plant_intervention") + count("plant_bloom"))
  }

  @Test
  fun `an event of a missing plant is rejected`() {
    assertRejected("la planta no existe") { event(1, "comentario") }
  }

  @Test
  fun `the migration invents no events for existing history`() {
    assertEquals(0L, count("plant_event"), "ninguna lectura, estado o movimiento previo se copia a la espina")
  }
}

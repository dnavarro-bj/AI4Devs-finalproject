package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios del esquema de lotes (ADR-002): las reglas viven también en la base de datos. */
class BatchSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 975_000L

  /** Una fila rechazada aborta la transacción: cada test provoca un solo rechazo y es lo último que hace. */
  private fun assertRejected(message: String, insert: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { insert() }
  }

  private fun batch(action: String = "lectura", scope: String = "plantas", count: Int = 3): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO batch (id, action, scope_kind, plant_count, occurred_at) VALUES (?, ?, ?, ?, now())",
      id, action, scope, count,
    )
    return id
  }

  private fun plantId(): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, ?, 'Planta', 200001, 300001)",
      id, "TEST-B-$id",
    )
    return id
  }

  private fun commentEvent(plant: Long, batch: Long?): Long {
    val id = ++sequence
    jdbc.update("INSERT INTO plant_event (id, plant_id, event_type, occurred_at, batch_id) VALUES (?, ?, 'comentario', now(), ?)", id, plant, batch)
    jdbc.update("INSERT INTO plant_comment (id, text) VALUES (?, 'Nota')", id)
    return id
  }

  private fun count(sql: String): Long = jdbc.queryForObject(sql, Long::class.java)!!

  @Test
  fun `a valid batch is accepted for each action and scope`() {
    batch("lectura", "plantas")
    batch("intervencion", "localizacion")
    batch("comentario", "consulta")

    assertEquals(3L, count("SELECT count(*) FROM batch"))
  }

  @Test
  fun `an unknown action is rejected`() {
    assertRejected("mover no es una acción de lote") { batch(action = "mover") }
  }

  @Test
  fun `an unknown scope kind is rejected`() {
    assertRejected("todo no es un tipo de alcance") { batch(scope = "todo") }
  }

  @Test
  fun `a batch without plants is rejected`() {
    assertRejected("un lote afecta al menos a una planta") { batch(count = 0) }
  }

  @Test
  fun `an event may belong to a batch and the reference must exist`() {
    val plant = plantId()
    val batch = batch()
    commentEvent(plant, batch)

    assertEquals(1L, count("SELECT count(*) FROM plant_event WHERE batch_id IS NOT NULL"))
    assertRejected("el lote 1 no existe") { commentEvent(plant, 1L) }
  }

  @Test
  fun `a care record may belong to a batch and the reference must exist`() {
    val plant = plantId()
    val batch = batch()
    jdbc.update(
      "INSERT INTO care_record (id, plant_id, water_amount_ml, recorded_at, batch_id) VALUES (?, ?, 200, now(), ?)",
      ++sequence, plant, batch,
    )

    assertEquals(1L, count("SELECT count(*) FROM care_record WHERE batch_id IS NOT NULL"))
    assertRejected("el lote 1 no existe") {
      jdbc.update(
        "INSERT INTO care_record (id, plant_id, water_amount_ml, recorded_at, batch_id) VALUES (?, ?, 200, now(), 1)",
        ++sequence, plant,
      )
    }
  }

  @Test
  fun `previous data carries no batch and nothing is invented`() {
    assertEquals(0L, count("SELECT count(*) FROM plant_event WHERE batch_id IS NOT NULL"))
    assertEquals(0L, count("SELECT count(*) FROM care_record WHERE batch_id IS NOT NULL"))
    assertEquals(0L, count("SELECT count(*) FROM batch"))
  }
}

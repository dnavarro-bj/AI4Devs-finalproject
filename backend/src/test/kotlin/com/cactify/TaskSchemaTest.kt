package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios del esquema de tareas (ADR-002): las reglas viven también en la base de datos. */
class TaskSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 980_000L

  /** Una fila rechazada aborta la transacción: cada test provoca un solo rechazo y es lo último que hace. */
  private fun assertRejected(message: String, insert: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { insert() }
  }

  private fun task(
    type: String = "riego",
    title: String = "Regar",
    priority: String = "normal",
    status: String = "pendiente",
    from: String = "2026-10-15",
    to: String = "2026-10-15",
    origin: String = "manual",
    location: Long? = 300001,
    completedAt: String? = null,
    affected: Int? = null,
    reason: String? = null,
  ): Long {
    val id = ++sequence
    jdbc.update(
      """
      INSERT INTO task (id, task_type, title, priority, status, due_from, due_to, origin, location_id,
        completed_at, affected_plants, closed_reason)
      VALUES (?, ?, ?, ?, ?, ?::date, ?::date, ?, ?, ?::timestamptz, ?, ?)
      """.trimIndent(),
      id, type, title, priority, status, from, to, origin, location, completedAt, affected, reason,
    )
    return id
  }

  private fun plantId(): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, ?, 'Planta', 200001, 300001)",
      id, "TEST-K-$id",
    )
    return id
  }

  @Test
  fun `a valid task is accepted with its defaults`() {
    val id = task()

    assertEquals("pendiente", jdbc.queryForObject("SELECT status FROM task WHERE id = ?", String::class.java, id))
  }

  @Test
  fun `every type is accepted and an unknown one is rejected`() {
    listOf("riego", "proteccion_frio", "proteccion_sol", "poda_raices", "cambio_maceta", "otra").forEach { task(type = it) }

    assertRejected("tipo desconocido") { task(type = "fumigar") }
  }

  @Test
  fun `an unknown priority is rejected`() {
    assertRejected("prioridad desconocida") { task(priority = "urgente") }
  }

  @Test
  fun `an unknown status is rejected`() {
    assertRejected("estado desconocido") { task(status = "vencida") }
  }

  @Test
  fun `an unknown origin is rejected`() {
    assertRejected("origen desconocido") { task(origin = "regla") }
  }

  @Test
  fun `a blank title is rejected`() {
    assertRejected("título en blanco") { task(title = "   ") }
  }

  @Test
  fun `a title longer than 120 characters is rejected`() {
    assertRejected("título largo") { task(title = "x".repeat(121)) }
  }

  @Test
  fun `the end of the period cannot precede its start`() {
    assertRejected("periodo invertido") { task(from = "2026-10-15", to = "2026-10-14") }
  }

  @Test
  fun `a period of several days is accepted`() {
    task(from = "2026-10-12", to = "2026-10-18")
  }

  @Test
  fun `a completed task needs its completion instant and its affected plants`() {
    task(status = "completada", completedAt = "2026-10-15T10:00:00Z", affected = 3)

    assertRejected("completada sin instante") { task(status = "completada", affected = 3) }
  }

  @Test
  fun `a completed task needs affected plants`() {
    assertRejected("completada sin plantas") { task(status = "completada", completedAt = "2026-10-15T10:00:00Z") }
  }

  @Test
  fun `a completed task cannot affect no plant`() {
    assertRejected("cero plantas") { task(status = "completada", completedAt = "2026-10-15T10:00:00Z", affected = 0) }
  }

  @Test
  fun `a pending task cannot carry a completion`() {
    assertRejected("pendiente con instante de fin") { task(completedAt = "2026-10-15T10:00:00Z") }
  }

  @Test
  fun `a closing reason belongs only to skipped or cancelled tasks`() {
    task(status = "omitida", reason = "lluvia")
    task(status = "cancelada", reason = "duplicada")

    assertRejected("motivo en una pendiente") { task(reason = "lluvia") }
  }

  @Test
  fun `a task points to a location that exists`() {
    assertRejected("localización inexistente") { task(location = 999_999_999L) }
  }

  @Test
  fun `a location with tasks cannot be deleted`() {
    val location = ++sequence
    jdbc.update("INSERT INTO location (id, name, code) VALUES (?, 'Con tareas', ?)", location, "LOC-K-$location")
    task(location = location)

    assertRejected("localización con tareas") { jdbc.update("DELETE FROM location WHERE id = ?", location) }
  }

  @Test
  fun `a plant appears once in the target of a task`() {
    val task = task(location = null)
    val plant = plantId()
    jdbc.update("INSERT INTO task_plant (task_id, plant_id) VALUES (?, ?)", task, plant)

    assertRejected("planta repetida en una tarea") {
      jdbc.update("INSERT INTO task_plant (task_id, plant_id) VALUES (?, ?)", task, plant)
    }
  }

  @Test
  fun `deleting a task deletes its plants and keeps the plants`() {
    val task = task(location = null)
    val plant = plantId()
    jdbc.update("INSERT INTO task_plant (task_id, plant_id) VALUES (?, ?)", task, plant)

    jdbc.update("DELETE FROM task WHERE id = ?", task)

    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM task_plant WHERE task_id = ?", Int::class.java, task))
    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM plant WHERE id = ?", Int::class.java, plant))
  }

  @Test
  fun `the event spine admits the task type and its satellite needs a task`() {
    val plant = plantId()
    val task = task()
    val event = ++sequence
    jdbc.update(
      "INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, 'tarea', now())",
      event, plant,
    )
    jdbc.update("INSERT INTO plant_task_event (id, task_id) VALUES (?, ?)", event, task)

    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM plant_task_event WHERE task_id = ?", Int::class.java, task))
  }

  @Test
  fun `the satellite of a task event rejects a missing task`() {
    val plant = plantId()
    val event = ++sequence
    jdbc.update(
      "INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, 'tarea', now())",
      event, plant,
    )

    assertRejected("evento de tarea sin tarea") {
      jdbc.update("INSERT INTO plant_task_event (id, task_id) VALUES (?, ?)", event, 999_999_999L)
    }
  }

  @Test
  fun `the previous event types are still accepted`() {
    val plant = plantId()

    listOf("comentario", "intervencion", "floracion").forEach {
      jdbc.update(
        "INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, ?, now())",
        ++sequence, plant, it,
      )
    }
  }

  @Test
  fun `a care record may point to a task but not to a task that does not exist`() {
    val plant = plantId()
    val task = task()
    jdbc.update(
      "INSERT INTO care_record (id, plant_id, humidity, recorded_at, task_id) VALUES (?, ?, 30, now(), ?)",
      ++sequence, plant, task,
    )

    assertRejected("lectura con tarea inexistente") {
      jdbc.update(
        "INSERT INTO care_record (id, plant_id, humidity, recorded_at, task_id) VALUES (?, ?, 30, now(), ?)",
        ++sequence, plant, 999_999_999L,
      )
    }
  }

  @Test
  fun `a care record without a task is still valid`() {
    val plant = plantId()

    jdbc.update("INSERT INTO care_record (id, plant_id, humidity, recorded_at) VALUES (?, ?, 30, now())", ++sequence, plant)
  }

  @Test
  fun `an intervention may point to a task but not to a task that does not exist`() {
    val plant = plantId()
    val task = task()
    val event = ++sequence
    jdbc.update("INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, 'intervencion', now())", event, plant)
    jdbc.update("INSERT INTO plant_intervention (id, intervention_type, task_id) VALUES (?, 'poda', ?)", event, task)

    val other = ++sequence
    jdbc.update("INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, 'intervencion', now())", other, plant)
    assertRejected("intervención con tarea inexistente") {
      jdbc.update("INSERT INTO plant_intervention (id, intervention_type, task_id) VALUES (?, 'poda', ?)", other, 999_999_999L)
    }
  }
}

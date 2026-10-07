package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios de «La alerta es una incidencia con ciclo de vida», «Sin duplicados» y del enlace con las tareas en el esquema (ADR-002). */
class AlertSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 980_000L

  /** Una fila rechazada aborta la transacción: cada test provoca un solo rechazo y es lo último que hace. */
  private fun assertRejected(message: String, block: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { block() }
  }

  private fun plantId(): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, ?, 'Planta', 200001, 300001)",
      id, "TEST-AL-$id",
    )
    return id
  }

  private fun alert(
    plant: Long? = null,
    location: Long? = null,
    source: String = "medicion",
    category: String = "temperatura",
    severity: String = "media",
    status: String = "nueva",
    reason: String = "Temperatura por debajo del mínimo",
    occurrences: Int = 1,
    closed: Boolean = status == "resuelta" || status == "descartada",
    careRecord: Long? = null,
  ): Long {
    val id = ++sequence
    jdbc.update(
      """
      INSERT INTO alert (id, plant_id, location_id, source, category, severity, status, reason, occurrences,
                         care_record_id, detected_at, last_detected_at, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now(), CASE WHEN ? THEN now() END)
      """.trimIndent(),
      id, plant, location, source, category, severity, status, reason, occurrences, careRecord, closed,
    )
    return id
  }

  private fun transition(alert: Long, from: String?, to: String) = jdbc.update(
    "INSERT INTO alert_transition (id, alert_id, from_status, to_status, occurred_at) VALUES (?, ?, ?, ?, now())",
    ++sequence, alert, from, to,
  )

  private fun count(table: String): Long = jdbc.queryForObject("SELECT count(*) FROM $table", Long::class.java)!!

  @Test
  fun `an alert on a plant and one on a location are accepted`() {
    alert(plant = plantId())
    alert(location = 300001)

    assertEquals(2L, count("alert"))
  }

  @Test
  fun `severity rank orders baja, media and critica`() {
    val plant = plantId()
    alert(plant = plant, category = "humedad", severity = "baja")
    alert(plant = plant, category = "luz", severity = "critica")
    alert(plant = plant, category = "temperatura", severity = "media")

    val order = jdbc.queryForList("SELECT severity FROM alert WHERE plant_id = ? ORDER BY severity_rank", String::class.java, plant)

    assertEquals(listOf("baja", "media", "critica"), order)
  }

  @Test
  fun `a plant and a location at once are rejected`() {
    val plant = plantId()
    assertRejected("planta y localización a la vez") { alert(plant = plant, location = 300001) }
  }

  @Test
  fun `neither a plant nor a location is rejected`() {
    assertRejected("sin planta ni localización") { alert() }
  }

  @Test
  fun `unknown source, category, severity and status are rejected`() {
    val plant = plantId()
    assertFailsWith<DataIntegrityViolationException> { alert(plant = plant, source = "telepatia") }
  }

  @Test
  fun `an unknown category is rejected`() {
    val plant = plantId()
    assertRejected("categoría desconocida") { alert(plant = plant, category = "ph") }
  }

  @Test
  fun `an unknown severity is rejected`() {
    val plant = plantId()
    assertRejected("severidad desconocida") { alert(plant = plant, severity = "gravisima") }
  }

  @Test
  fun `a blank reason is rejected`() {
    val plant = plantId()
    assertRejected("motivo en blanco") { alert(plant = plant, reason = "  ") }
  }

  @Test
  fun `zero occurrences are rejected`() {
    val plant = plantId()
    assertRejected("ocurrencias a cero") { alert(plant = plant, occurrences = 0) }
  }

  @Test
  fun `a final status without a closing date is rejected`() {
    val plant = plantId()
    assertRejected("resuelta sin fecha de cierre") { alert(plant = plant, status = "resuelta", closed = false) }
  }

  @Test
  fun `an open status with a closing date is rejected`() {
    val plant = plantId()
    assertRejected("nueva con fecha de cierre") { alert(plant = plant, status = "nueva", closed = true) }
  }

  @Test
  fun `two open alerts of the same condition on a plant are rejected`() {
    val plant = plantId()
    alert(plant = plant)
    assertRejected("dos abiertas iguales") { alert(plant = plant, severity = "baja") }
  }

  @Test
  fun `a closed alert and a new one of the same condition coexist`() {
    val plant = plantId()
    alert(plant = plant, status = "resuelta")
    alert(plant = plant, status = "descartada")
    alert(plant = plant)

    assertEquals(3L, count("alert"))
  }

  @Test
  fun `a revisada alert still blocks a duplicate`() {
    val plant = plantId()
    alert(plant = plant, status = "revisada")
    assertRejected("la revisada sigue abierta") { alert(plant = plant) }
  }

  @Test
  fun `manual alerts are exempt from the duplicate rule`() {
    val plant = plantId()
    alert(plant = plant, source = "manual", category = "otra")
    alert(plant = plant, source = "manual", category = "otra")

    assertEquals(2L, count("alert"))
  }

  @Test
  fun `different categories and sources do not collide`() {
    val plant = plantId()
    alert(plant = plant, category = "temperatura")
    alert(plant = plant, category = "humedad")
    alert(plant = plant, source = "recomendacion_ia", category = "temperatura")

    assertEquals(3L, count("alert"))
  }

  @Test
  fun `two open alerts of the same condition on a location are rejected`() {
    alert(location = 300001, source = "cuidado_vencido", category = "riego")
    assertRejected("dos abiertas en la localización") { alert(location = 300001, source = "cuidado_vencido", category = "riego") }
  }

  @Test
  fun `the opening has no previous status and the rest do`() {
    val a = alert(plant = plantId())
    transition(a, null, "nueva")
    transition(a, "nueva", "revisada")
    transition(a, "revisada", "resuelta")

    assertEquals(3L, count("alert_transition"))
  }

  @Test
  fun `a transition to nueva with a previous status is rejected`() {
    val a = alert(plant = plantId())
    assertRejected("la apertura sin estado anterior") { transition(a, "revisada", "nueva") }
  }

  @Test
  fun `a transition to another status without a previous one is rejected`() {
    val a = alert(plant = plantId())
    assertRejected("solo la apertura carece de estado anterior") { transition(a, null, "revisada") }
  }

  @Test
  fun `a transition to the same status is rejected`() {
    val a = alert(plant = plantId())
    assertRejected("transición a sí mismo") { transition(a, "revisada", "revisada") }
  }

  @Test
  fun `a tasks origin can be an alert and then it needs one`() {
    val a = alert(plant = plantId())
    val id = ++sequence
    jdbc.update(
      "INSERT INTO task (id, task_type, title, due_from, due_to, origin, origin_alert_id, location_id) VALUES (?, 'otra', 'Revisar', current_date, current_date, 'alerta', ?, 300001)",
      id, a,
    )

    assertEquals("alerta", jdbc.queryForObject("SELECT origin FROM task WHERE id = ?", String::class.java, id))
  }

  @Test
  fun `an alert origin without an alert is rejected`() {
    assertRejected("origen alerta sin alerta") {
      jdbc.update(
        "INSERT INTO task (id, task_type, title, due_from, due_to, origin, location_id) VALUES (?, 'otra', 'Revisar', current_date, current_date, 'alerta', 300001)",
        ++sequence,
      )
    }
  }

  @Test
  fun `an alert of a missing plant is rejected`() {
    assertRejected("planta inexistente") { alert(plant = 1) }
  }

  @Test
  fun `the migration invents no alerts for existing readings`() {
    assertEquals(0L, count("alert"))
    assertEquals(0L, count("alert_transition"))
  }
}

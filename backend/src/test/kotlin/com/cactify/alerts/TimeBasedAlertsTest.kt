package com.cactify.alerts

import com.cactify.application.AlertDetectionService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Proceso programado de las condiciones de tiempo». El reloj es el mutable: no se espera al planificador. */
class TimeBasedAlertsTest : AbstractAlertTest() {

  @Autowired
  lateinit var detection: AlertDetectionService

  private var sequence = 996_000L

  private fun daysAgo(days: Long): Instant = clock.instant().minus(Duration.ofDays(days))
  private fun today(): LocalDate = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC)

  private fun comment(plant: String, at: Instant) {
    val id = ++sequence
    jdbcTemplate.update(
      "INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, 'comentario', ?)",
      id, plant.toLong(), java.sql.Timestamp.from(at),
    )
    jdbcTemplate.update("INSERT INTO plant_comment (id, text) VALUES (?, 'Nota')", id)
  }

  private fun task(
    dueDaysAgo: Long,
    type: String = "riego",
    status: String = "pendiente",
    location: Long? = null,
    vararg plants: String,
  ): Long {
    val id = ++sequence
    val due = java.sql.Date.valueOf(today().minusDays(dueDaysAgo))
    jdbcTemplate.update(
      "INSERT INTO task (id, task_type, title, due_from, due_to, status, location_id) VALUES (?, ?, 'Regar', ?, ?, ?, ?)",
      id, type, due, due, status, location,
    )
    plants.forEach { jdbcTemplate.update("INSERT INTO task_plant (task_id, plant_id) VALUES (?, ?)", id, it.toLong()) }
    return id
  }

  // ---- Sin revisar ----

  @Test
  fun `a plant without observations for 43 days opens a follow-up alert saying the days`() {
    val plant = newPlant(createdAt = daysAgo(43))

    detection.detectTimeBased()

    val alert = alertsOf(plant).single()
    assertEquals("sin_revisar", alert["source"])
    assertEquals("seguimiento", alert["category"])
    assertEquals("baja", alert["severity"])
    assertTrue((alert["reason"] as String).contains("43 días"), alert["reason"].toString())
    assertEquals("nueva", transitionsOf(alert["id"]).single()["to_status"])
  }

  @Test
  fun `a recent observation prevents it even if the last reading is old`() {
    val plant = newPlant(createdAt = daysAgo(200))
    jdbcTemplate.update(
      "INSERT INTO care_record (id, plant_id, humidity, recorded_at) VALUES (?, ?, 20, ?)",
      ++sequence, plant.toLong(), java.sql.Timestamp.from(daysAgo(90)),
    )
    comment(plant, daysAgo(5))

    detection.detectTimeBased()

    assertTrue(alertsOf(plant).isEmpty())
  }

  @Test
  fun `a plant that is younger than the threshold is not unreviewed`() {
    val plant = newPlant(createdAt = daysAgo(10))

    detection.detectTimeBased()

    assertTrue(alertsOf(plant).isEmpty())
  }

  @Test
  fun `a movement or a status change is not an observation`() {
    val plant = newPlant(createdAt = daysAgo(100))
    jdbcTemplate.update(
      "INSERT INTO plant_movement (id, plant_id, from_location_id, to_location_id, moved_at) VALUES (?, ?, 300001, 300002, ?)",
      ++sequence, plant.toLong(), java.sql.Timestamp.from(daysAgo(2)),
    )
    jdbcTemplate.update(
      "INSERT INTO plant_status_change (id, plant_id, from_status, to_status, occurred_at) VALUES (?, ?, 'activa', 'enferma', ?)",
      ++sequence, plant.toLong(), java.sql.Timestamp.from(daysAgo(1)),
    )

    detection.detectTimeBased()

    assertEquals(listOf("sin_revisar"), alertsOf(plant).map { it["source"] })
  }

  @Test
  fun `an archived plant generates nothing`() {
    val plant = newPlant(status = "muerta", createdAt = daysAgo(200))

    detection.detectTimeBased()

    assertTrue(alertsOf(plant).isEmpty())
  }

  // ---- Cuidado vencido ----

  @Test
  fun `an overdue watering task of one plant opens a watering alert`() {
    val plant = newPlant(createdAt = daysAgo(1))
    task(dueDaysAgo = 3, plants = arrayOf(plant))

    detection.detectTimeBased()

    val alert = alertsOf(plant).single()
    assertEquals("cuidado_vencido", alert["source"])
    assertEquals("riego", alert["category"])
    assertTrue((alert["reason"] as String).contains("3 días"), alert["reason"].toString())
  }

  @Test
  fun `an overdue task of another type is a follow-up`() {
    val plant = newPlant(createdAt = daysAgo(1))
    task(dueDaysAgo = 3, type = "poda_raices", plants = arrayOf(plant))

    detection.detectTimeBased()

    assertEquals("seguimiento", alertsOf(plant).single()["category"])
  }

  @Test
  fun `an overdue task of a location opens an alert on the location`() {
    task(dueDaysAgo = 4, location = 300003)

    detection.detectTimeBased()

    val alert = alertsOfLocation(300003).single()
    assertEquals("cuidado_vencido", alert["source"])
  }

  @Test
  fun `a task of several plants generates no alert`() {
    val a = newPlant(createdAt = daysAgo(1))
    val b = newPlant(createdAt = daysAgo(1))
    task(dueDaysAgo = 10, plants = arrayOf(a, b))

    detection.detectTimeBased()

    assertTrue(alertsOf(a).isEmpty() && alertsOf(b).isEmpty())
  }

  @Test
  fun `a task that is no longer pending generates no alert`() {
    val plant = newPlant(createdAt = daysAgo(1))
    task(dueDaysAgo = 10, status = "cancelada", plants = arrayOf(plant))

    detection.detectTimeBased()

    assertTrue(alertsOf(plant).isEmpty())
  }

  @Test
  fun `a task overdue by less than the threshold is not overdue yet`() {
    val plant = newPlant(createdAt = daysAgo(1))
    task(dueDaysAgo = 1, plants = arrayOf(plant))

    detection.detectTimeBased()

    assertTrue(alertsOf(plant).isEmpty())
  }

  // ---- Idempotencia ----

  @Test
  fun `running twice the same day adds no occurrence`() {
    val plant = newPlant(createdAt = daysAgo(43))

    detection.detectTimeBased()
    val second = detection.detectTimeBased()

    assertEquals(1, alertsOf(plant).single()["occurrences"])
    assertEquals(0, second.accumulated)
  }

  @Test
  fun `running the next day adds one occurrence and moves the last detection`() {
    val plant = newPlant(createdAt = daysAgo(43))
    detection.detectTimeBased()
    clock.advanceBy(Duration.ofDays(1))

    detection.detectTimeBased()

    val alert = alertsOf(plant).single()
    assertEquals(2, alert["occurrences"])
    assertEquals(clock.instant(), instant(alert["last_detected_at"]))
  }

  @Test
  fun `the condition disappearing closes nothing`() {
    val plant = newPlant(createdAt = daysAgo(43))
    detection.detectTimeBased()
    comment(plant, clock.instant())
    clock.advanceBy(Duration.ofDays(1))

    detection.detectTimeBased()

    val alert = alertsOf(plant).single()
    assertEquals("nueva", alert["status"])
    assertEquals(1, alert["occurrences"], "la condición ya no se detecta: no hay ocurrencia nueva")
  }

  @Test
  fun `several days of recurrence escalate the severity`() {
    val plant = newPlant(createdAt = daysAgo(43))
    repeat(3) {
      detection.detectTimeBased()
      clock.advanceBy(Duration.ofDays(1))
    }

    assertEquals("media", alertsOf(plant).single()["severity"])
  }
}

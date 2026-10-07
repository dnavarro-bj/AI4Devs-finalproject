package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Invariantes de la tarea (ADR-011): destino exclusivo, periodo, transiciones y rechazos que no cambian nada. */
class TaskTest {

  private val now = Instant.parse("2026-10-07T09:30:00Z")
  private val clock = Clock.fixed(now, ZoneOffset.UTC)
  private val skew = Duration.ofMinutes(5)

  private val location = Location(name = "Invernadero 1", code = com.cactify.locationCode("Invernadero 1"))
  private val soilMix = SoilMix(
    name = "Sustrato", organicPercentage = 40, mineralPercentage = 60,
    phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"),
  )
  private val species = Species(
    code = "TEST-A", scientificName = "Testus plantus", commonName = "Planta de prueba",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "semanal", soilMix = soilMix,
  )

  private fun plant(n: Int = 1) = Plant(code = "TEST-A-0$n", nickname = "Bola $n", species = species, location = location)

  private val day = LocalDate.parse("2026-10-15")

  private fun task(
    title: String = "Regar",
    from: LocalDate = day,
    to: LocalDate = day,
    target: TaskTarget = TaskTarget.Location(location),
    notes: String? = null,
  ) = Task.create(TaskType.Watering, title, TaskPriority.Normal, from, to, notes, target)

  // ---- Alta ----

  @Test
  fun `a new task is pending and manual`() {
    val task = task()

    assertEquals(TaskStatus.Pending, task.status)
    assertEquals(TaskOrigin.Manual, task.origin)
    assertNull(task.completedAt)
    assertNull(task.affectedPlants)
  }

  @Test
  fun `the title is trimmed and the notes cleaned`() {
    val task = task(title = "  Regar bandejas  ", notes = "   ")

    assertEquals("Regar bandejas", task.title)
    assertNull(task.notes)
  }

  @Test
  fun `a blank title is rejected`() {
    assertFailsWith<IllegalArgumentException> { task(title = "   ") }
  }

  @Test
  fun `a title over 120 characters is rejected`() {
    assertFailsWith<IllegalArgumentException> { task(title = "x".repeat(121)) }
    task(title = "x".repeat(120))
  }

  @Test
  fun `notes over 2000 characters are rejected`() {
    assertFailsWith<IllegalArgumentException> { task(notes = "x".repeat(2001)) }
  }

  @Test
  fun `the end of the period cannot precede its start`() {
    assertFailsWith<IllegalArgumentException> { task(from = day, to = day.minusDays(1)) }
    task(from = day, to = day.plusDays(6))
  }

  // ---- Destino ----

  @Test
  fun `a target of plants needs between one and 500 distinct plants`() {
    assertFailsWith<IllegalArgumentException> { TaskTarget.Plants(emptySet()) }
    TaskTarget.Plants(setOf(plant()))
  }

  @Test
  fun `more than 500 plants are rejected`() {
    val many = (1..501).map { Plant(code = "TEST-A-$it", nickname = "P$it", species = species, location = location) }.toSet()

    assertFailsWith<IllegalArgumentException> { TaskTarget.Plants(many) }
  }

  @Test
  fun `the task exposes either a location or plants and never both`() {
    val byLocation = task(target = TaskTarget.Location(location))
    val byPlants = task(target = TaskTarget.Plants(setOf(plant())))

    assertEquals(location, byLocation.location)
    assertTrue(byLocation.plants.isEmpty())
    assertNull(byPlants.location)
    assertEquals(1, byPlants.plants.size)
  }

  // ---- Edición ----

  @Test
  fun `replacing a pending task changes everything including the target`() {
    val task = task()

    task.replace(
      TaskType.Repotting, "Cambiar macetas", TaskPriority.High, day.plusDays(3), day.plusDays(5), "Con cuidado",
      TaskTarget.Plants(setOf(plant())),
    )

    assertEquals(TaskType.Repotting, task.type)
    assertEquals("Cambiar macetas", task.title)
    assertEquals(TaskPriority.High, task.priority)
    assertEquals(day.plusDays(5), task.dueTo)
    assertNull(task.location)
    assertEquals(1, task.plants.size)
  }

  @Test
  fun `a rejected replacement changes nothing`() {
    val task = task()

    assertFailsWith<IllegalArgumentException> {
      task.replace(TaskType.Repotting, "  ", TaskPriority.High, day, day, null, TaskTarget.Location(location))
    }

    assertEquals("Regar", task.title)
    assertEquals(TaskType.Watering, task.type)
  }

  @Test
  fun `rescheduling changes only the period`() {
    val task = task()

    task.reschedule(day.plusDays(7), day.plusDays(9))

    assertEquals(day.plusDays(7), task.dueFrom)
    assertEquals(day.plusDays(9), task.dueTo)
    assertEquals("Regar", task.title)
  }

  @Test
  fun `an invalid reschedule changes nothing`() {
    val task = task()

    assertFailsWith<IllegalArgumentException> { task.reschedule(day.plusDays(2), day) }

    assertEquals(day, task.dueFrom)
  }

  // ---- Transiciones ----

  @Test
  fun `completing records the instant and the affected plants`() {
    val task = task()

    task.complete(now, 4)

    assertEquals(TaskStatus.Completed, task.status)
    assertEquals(now, task.completedAt)
    assertEquals(4, task.affectedPlants)
  }

  @Test
  fun `completing with no affected plant is rejected`() {
    val task = task()

    assertFailsWith<IllegalArgumentException> { task.complete(now, 0) }

    assertEquals(TaskStatus.Pending, task.status)
  }

  @Test
  fun `skipping and cancelling keep the reason, trimmed, and nothing else`() {
    val skipped = task().apply { skip("  lluvia ") }
    val cancelled = task().apply { cancel(null) }

    assertEquals(TaskStatus.Skipped, skipped.status)
    assertEquals("lluvia", skipped.closedReason)
    assertEquals(TaskStatus.Cancelled, cancelled.status)
    assertNull(cancelled.closedReason)
    assertNull(skipped.completedAt)
  }

  @Test
  fun `a reason over 500 characters is rejected`() {
    val task = task()

    assertFailsWith<IllegalArgumentException> { task.skip("x".repeat(501)) }

    assertEquals(TaskStatus.Pending, task.status)
  }

  @Test
  fun `a closed task cannot be edited, rescheduled or closed again`() {
    val completed = task().apply { complete(now, 1) }
    val skipped = task().apply { skip(null) }
    val cancelled = task().apply { cancel(null) }

    listOf(completed, skipped, cancelled).forEach { closed ->
      assertFailsWith<TaskNotPendingException> { closed.complete(now, 1) }
      assertFailsWith<TaskNotPendingException> { closed.skip(null) }
      assertFailsWith<TaskNotPendingException> { closed.cancel(null) }
      assertFailsWith<TaskNotPendingException> { closed.reschedule(day, day) }
      assertFailsWith<TaskNotPendingException> {
        closed.replace(TaskType.Other, "x", TaskPriority.Low, day, day, null, TaskTarget.Location(location))
      }
    }
    assertEquals(TaskStatus.Completed, completed.status)
  }

  // ---- Evento y enlaces ----

  @Test
  fun `a task event is stamped against the clock and cannot be in the future`() {
    val task = task()

    val event = PlantTaskEvent.record(plant(), task, null, clock, skew)

    assertEquals(now, event.occurredAt)
    assertEquals(task, event.task)
    assertFailsWith<IllegalArgumentException> {
      PlantTaskEvent.record(plant(), task, now.plus(Duration.ofHours(1)), clock, skew)
    }
  }

  @Test
  fun `a care record and an intervention may be linked to the task that produced them`() {
    val task = task()

    val reading = CareRecord.record(plant(), waterAmountMl = 200, recordedAt = null, clock = clock, maxFutureSkew = skew, task = task)
    val pruning = PlantIntervention.record(
      plant(), InterventionType.Pruning, null, null, null, null, null, clock, skew, task = task,
    )
    val direct = CareRecord.record(plant(), waterAmountMl = 200, recordedAt = null, clock = clock, maxFutureSkew = skew)

    assertEquals(task, reading.task)
    assertEquals(task, pruning.task)
    assertNull(direct.task)
  }
}

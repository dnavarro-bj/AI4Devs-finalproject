package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Los enumerados de tareas (ADR-007): `value` explícito, `invoke()` que normaliza y falla ante lo desconocido. */
class TaskEnumsTest {

  @Test
  fun `task types parse their persisted values`() {
    assertEquals(
      listOf("riego", "proteccion_frio", "proteccion_sol", "poda_raices", "cambio_maceta", "otra"),
      TaskType.entries.map { it.value },
    )
    assertEquals(TaskType.Repotting, TaskType(" CAMBIO_MACETA "))
    assertEquals("riego", TaskType.Watering.toString())
    assertFailsWith<IllegalArgumentException> { TaskType("fumigar") }
  }

  @Test
  fun `priorities parse their persisted values`() {
    assertEquals(listOf("alta", "normal", "baja"), TaskPriority.entries.map { it.value })
    assertEquals(TaskPriority.High, TaskPriority(" Alta"))
    assertFailsWith<IllegalArgumentException> { TaskPriority("urgente") }
  }

  @Test
  fun `statuses parse their persisted values and only pending is open`() {
    assertEquals(listOf("pendiente", "completada", "omitida", "cancelada"), TaskStatus.entries.map { it.value })
    assertEquals(TaskStatus.Skipped, TaskStatus("omitida"))
    assertEquals(listOf(TaskStatus.Pending), TaskStatus.entries.filter { !it.isClosed })
    assertFailsWith<IllegalArgumentException> { TaskStatus("vencida") }
  }

  @Test
  fun `the origin starts with manual`() {
    assertEquals(listOf("manual"), TaskOrigin.entries.map { it.value })
    assertEquals(TaskOrigin.Manual, TaskOrigin("MANUAL"))
    assertFailsWith<IllegalArgumentException> { TaskOrigin("regla") }
  }

  @Test
  fun `an unknown task type names the valid ones`() {
    val error = assertFailsWith<IllegalArgumentException> { TaskType("fumigar") }

    assertEquals(true, error.message!!.contains("fumigar") && error.message!!.contains("riego"))
  }
}

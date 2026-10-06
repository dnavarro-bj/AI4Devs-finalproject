package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Los siete estados y su matriz de transiciones (ADR-007 para el enum, ADR-011 para la regla). */
class PlantStatusTest {

  private val inProgress = listOf(PlantStatus.Active, PlantStatus.Quarantine, PlantStatus.Sick)
  private val finals = listOf(PlantStatus.Given, PlantStatus.Sold, PlantStatus.Dead, PlantStatus.Lost)

  @Test
  fun `the seven statuses have an explicit value`() {
    assertEquals(
      listOf("activa", "cuarentena", "enferma", "cedida", "vendida", "muerta", "perdida"),
      PlantStatus.entries.map { it.value },
    )
  }

  @Test
  fun `invoke normalizes and rejects the unknown`() {
    assertEquals(PlantStatus.Quarantine, PlantStatus(" Cuarentena "))
    assertFailsWith<IllegalArgumentException> { PlantStatus("fantasma") }
  }

  @Test
  fun `toString is the value`() {
    assertEquals("muerta", PlantStatus.Dead.toString())
  }

  @Test
  fun `three statuses are in progress and four are final`() {
    assertEquals(inProgress, PlantStatus.entries.filter { !it.isFinal })
    assertEquals(finals, PlantStatus.entries.filter { it.isFinal })
    assertEquals(inProgress.toSet(), PlantStatus.inProgress)
  }

  @Test
  fun `between statuses in progress anything goes to anything else`() {
    for (from in inProgress) for (to in inProgress) {
      if (from != to) assertTrue(from.canMoveTo(to), "$from → $to debía permitirse")
    }
  }

  @Test
  fun `from in progress to a final status is allowed`() {
    for (from in inProgress) for (to in finals) {
      assertTrue(from.canMoveTo(to), "$from → $to debía permitirse")
    }
  }

  @Test
  fun `from a final status only back to active`() {
    for (from in finals) {
      assertTrue(from.canMoveTo(PlantStatus.Active), "$from → activa es la corrección")
      for (to in PlantStatus.entries.filter { it != PlantStatus.Active }) {
        assertFalse(from.canMoveTo(to), "$from → $to no debía permitirse")
      }
    }
  }

  @Test
  fun `a status cannot move to itself`() {
    for (status in PlantStatus.entries) {
      assertFalse(status.canMoveTo(status), "$status → $status no es un cambio")
    }
  }
}

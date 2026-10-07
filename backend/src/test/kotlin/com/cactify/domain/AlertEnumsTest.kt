package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Los enumerados de las alertas, con el patrón de ADR-007, y las transiciones del ciclo de vida. */
class AlertEnumsTest {

  @Test
  fun `statuses parse their persisted values`() {
    assertEquals(listOf("nueva", "revisada", "resuelta", "descartada"), AlertStatus.entries.map { it.value })
    assertEquals(AlertStatus.Reviewed, AlertStatus(" REVISADA "))
    assertEquals("descartada", AlertStatus.Dismissed.toString())
    assertFailsWith<IllegalArgumentException> { AlertStatus("cerrada") }
  }

  @Test
  fun `only new and reviewed are open`() {
    assertEquals(setOf(AlertStatus.New, AlertStatus.Reviewed), AlertStatus.open)
    assertTrue(AlertStatus.New.isOpen)
    assertFalse(AlertStatus.Resolved.isOpen)
  }

  @Test
  fun `the allowed transitions are exactly those of the lifecycle`() {
    val allowed = setOf(
      AlertStatus.New to AlertStatus.Reviewed,
      AlertStatus.New to AlertStatus.Resolved,
      AlertStatus.New to AlertStatus.Dismissed,
      AlertStatus.Reviewed to AlertStatus.Resolved,
      AlertStatus.Reviewed to AlertStatus.Dismissed,
    )
    for (from in AlertStatus.entries) for (to in AlertStatus.entries) {
      assertEquals((from to to) in allowed, from.canMoveTo(to), "$from → $to")
    }
  }

  @Test
  fun `sources and categories parse their persisted values`() {
    assertEquals(
      listOf("medicion", "sin_revisar", "cuidado_vencido", "manual", "recomendacion_ia"),
      AlertSource.entries.map { it.value },
    )
    assertEquals(AlertSource.CareOverdue, AlertSource("cuidado_vencido"))
    assertEquals(listOf("temperatura", "humedad", "luz", "riego", "seguimiento", "otra"), AlertCategory.entries.map { it.value })
    assertEquals(AlertCategory.Light, AlertCategory(" Luz "))
    assertFailsWith<IllegalArgumentException> { AlertSource("telepatia") }
    assertFailsWith<IllegalArgumentException> { AlertCategory("ph") }
  }

  @Test
  fun `severity orders by rank and not alphabetically`() {
    assertEquals(listOf("baja", "media", "critica"), AlertSeverity.entries.sortedBy { it.rank }.map { it.value })
    assertEquals(AlertSeverity.Critical, AlertSeverity.max(AlertSeverity.Low, AlertSeverity.Critical))
    assertEquals(AlertSeverity.Critical, AlertSeverity.max(AlertSeverity.Critical, AlertSeverity.Medium))
    assertEquals(AlertSeverity.Medium, AlertSeverity("MEDIA"))
    assertFailsWith<IllegalArgumentException> { AlertSeverity("gravisima") }
  }

  @Test
  fun `an unknown value names the valid ones`() {
    val error = assertFailsWith<IllegalArgumentException> { AlertSeverity("urgente") }

    assertTrue(error.message!!.contains("urgente") && error.message!!.contains("critica"))
  }
}

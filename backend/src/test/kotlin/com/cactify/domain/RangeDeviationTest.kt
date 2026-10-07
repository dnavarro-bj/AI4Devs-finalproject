package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Cuánto se aparta una medida de su rango, y la severidad que sale de esa distancia. */
class RangeDeviationTest {

  private val thresholds = AlertThresholds()

  @Test
  fun `a value inside the range deviates by nothing`() {
    assertNull(RangeDeviation.of(20, 10, 30))
    assertNull(RangeDeviation.of(10, 10, 30), "el límite exacto está dentro")
    assertNull(RangeDeviation.of(30, 10, 30))
  }

  @Test
  fun `a value below the minimum is measured against the width of the range`() {
    val d = RangeDeviation.of(5, 10, 30)!!

    assertEquals(RangeDeviation.Direction.Below, d.direction)
    assertEquals(0.25, d.distance, 1e-9)
    assertEquals(10, d.limit)
  }

  @Test
  fun `a value above the maximum is measured against the width of the range`() {
    val d = RangeDeviation.of(45, 10, 30)!!

    assertEquals(RangeDeviation.Direction.Above, d.direction)
    assertEquals(0.75, d.distance, 1e-9)
    assertEquals(30, d.limit)
  }

  @Test
  fun `a degenerate range uses a width of one`() {
    val d = RangeDeviation.of(12, 10, 10)!!

    assertEquals(2.0, d.distance, 1e-9)
  }

  @Test
  fun `a missing bound does not evaluate that side`() {
    assertNull(RangeDeviation.of(-100, null, 30))
    assertNull(RangeDeviation.of(500, 10, null))
    assertNull(RangeDeviation.of(5, null, null))
    assertEquals(RangeDeviation.Direction.Below, RangeDeviation.of(5, 10, null)!!.direction)
  }

  @Test
  fun `severity cuts are 25 and 75 percent of the width`() {
    assertEquals(AlertSeverity.Low, thresholds.severityByDeviation(0.24))
    assertEquals(AlertSeverity.Medium, thresholds.severityByDeviation(0.25))
    assertEquals(AlertSeverity.Medium, thresholds.severityByDeviation(0.74))
    assertEquals(AlertSeverity.Critical, thresholds.severityByDeviation(0.75))
    assertEquals(AlertSeverity.Critical, thresholds.severityByDeviation(3.0))
  }

  @Test
  fun `occurrences escalate to medium at 3 and to critical at 6`() {
    assertEquals(AlertSeverity.Low, thresholds.severityByOccurrences(1))
    assertEquals(AlertSeverity.Low, thresholds.severityByOccurrences(2))
    assertEquals(AlertSeverity.Medium, thresholds.severityByOccurrences(3))
    assertEquals(AlertSeverity.Medium, thresholds.severityByOccurrences(5))
    assertEquals(AlertSeverity.Critical, thresholds.severityByOccurrences(6))
  }
}

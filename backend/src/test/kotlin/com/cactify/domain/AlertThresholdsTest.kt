package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios de «Umbrales en configuración». */
class AlertThresholdsTest {

  @Test
  fun `the defaults are 30 days, 2 days, 3 and 6 occurrences and 25 and 75 percent`() {
    val t = AlertThresholds()

    assertEquals(30, t.unreviewedDays)
    assertEquals(2, t.overdueDays)
    assertEquals(3, t.mediumOccurrences)
    assertEquals(6, t.criticalOccurrences)
    assertEquals(0.25, t.mediumDeviation)
    assertEquals(0.75, t.criticalDeviation)
  }

  @Test
  fun `a critical occurrence threshold below the medium one is incoherent`() {
    val error = assertFailsWith<IllegalArgumentException> { AlertThresholds(mediumOccurrences = 5, criticalOccurrences = 2) }

    assertEquals(true, error.message!!.contains("ocurrencias"))
  }

  @Test
  fun `a critical deviation below the medium one is incoherent`() {
    assertFailsWith<IllegalArgumentException> { AlertThresholds(mediumDeviation = 0.8, criticalDeviation = 0.5) }
  }

  @Test
  fun `thresholds must be positive`() {
    assertFailsWith<IllegalArgumentException> { AlertThresholds(unreviewedDays = 0) }
    assertFailsWith<IllegalArgumentException> { AlertThresholds(overdueDays = -1) }
    assertFailsWith<IllegalArgumentException> { AlertThresholds(mediumOccurrences = 0) }
    assertFailsWith<IllegalArgumentException> { AlertThresholds(mediumDeviation = 0.0) }
  }
}

package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Los dos enumerados de dominio, con el patrón que fija ADR-007: `value` explícito, `invoke()` que
 * normaliza y falla ante lo desconocido, y `toString()` que devuelve el valor persistido.
 */
class DomainEnumsTest {

  @Test
  fun `risk level parses its persisted values`() {
    assertEquals(RiskLevel.Low, RiskLevel("low"))
    assertEquals(RiskLevel.Medium, RiskLevel("medium"))
    assertEquals(RiskLevel.High, RiskLevel("high"))
  }

  @Test
  fun `risk level normalises surrounding spaces and capitalisation`() {
    assertEquals(RiskLevel.High, RiskLevel("  HIGH "))
    assertEquals(RiskLevel.Medium, RiskLevel("Medium"))
  }

  @Test
  fun `an unknown risk level fails on the spot, naming the offending value`() {
    val error = assertFailsWith<IllegalArgumentException> { RiskLevel("altisimo") }

    assertEquals(true, error.message!!.contains("altisimo"))
  }

  @Test
  fun `risk level renders as its persisted value, not as the constant name`() {
    assertEquals("high", RiskLevel.High.toString())
    assertEquals("low", RiskLevel.Low.toString())
  }

  @Test
  fun `priority parses its persisted values`() {
    assertEquals(Priority.Immediate, Priority("immediate"))
    assertEquals(Priority.Soon, Priority("soon"))
    assertEquals(Priority.Routine, Priority("routine"))
  }

  @Test
  fun `priority normalises and fails on the unknown`() {
    assertEquals(Priority.Soon, Priority(" Soon "))
    assertFailsWith<IllegalArgumentException> { Priority("urgentisimo") }
  }

  @Test
  fun `priority renders as its persisted value`() {
    assertEquals("immediate", Priority.Immediate.toString())
  }
}

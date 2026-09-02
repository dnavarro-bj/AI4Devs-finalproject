package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Invariantes de `SoilMix`. Test **unitario**: una regla del modelo no necesita base de datos para
 * probarse, porque el rechazo ocurre antes de intentar persistir nada (ADR-011).
 */
class SoilMixInvariantsTest {

  private fun soilMix(
    name: String = "Sustrato de prueba",
    organic: Int = 40,
    mineral: Int = 60,
    phMin: String = "5.5",
    phMax: String = "6.5",
  ) = SoilMix(
    name = name,
    organicPercentage = organic,
    mineralPercentage = mineral,
    phMin = BigDecimal(phMin),
    phMax = BigDecimal(phMax),
  )

  @Test
  fun `a soil mix whose percentages do not add up to 100 cannot be created`() {
    val error = assertFailsWith<IllegalArgumentException> { soilMix(organic = 90, mineral = 90) }

    assertEquals(true, error.message!!.contains("100"), "el mensaje debe decir cuál es la regla")
  }

  @Test
  fun `a soil mix with an inverted pH range cannot be created`() {
    assertFailsWith<IllegalArgumentException> { soilMix(phMin = "7.0", phMax = "5.5") }
  }

  @Test
  fun `a soil mix without a name cannot be created`() {
    assertFailsWith<IllegalArgumentException> { soilMix(name = "   ") }
  }

  @Test
  fun `a percentage outside 0-100 cannot be created`() {
    assertFailsWith<IllegalArgumentException> { soilMix(organic = -20, mineral = 120) }
  }

  @Test
  fun `a pH outside the scale cannot be created`() {
    assertFailsWith<IllegalArgumentException> { soilMix(phMin = "-1.0", phMax = "6.5") }
  }

  @Test
  fun `a valid soil mix is built and keeps what it was given`() {
    val mix = soilMix(name = "Sustrato mineral", organic = 20, mineral = 80)

    assertEquals("Sustrato mineral", mix.name)
    assertEquals(20, mix.organicPercentage)
    assertEquals(80, mix.mineralPercentage)
  }

  @Test
  fun `a pH range with both ends equal is valid`() {
    val mix = soilMix(phMin = "6.0", phMax = "6.0")

    assertEquals(BigDecimal("6.0"), mix.phMin)
  }
}

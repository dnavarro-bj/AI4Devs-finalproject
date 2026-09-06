package com.cactify.domain

import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import org.junit.jupiter.api.Test

/**
 * La corrección de una mezcla es reemplazo completo, así que vuelve a pasar por las mismas
 * invariantes que el alta: una composición que no cuadra se rechaza igual **y deja intacto lo
 * anterior**. Es la misma regla que `LocationRenameTest` fija para el renombrado.
 */
class SoilMixUpdateTest {

  @Test
  fun `a correction that breaks the composition is rejected and leaves the mix intact`() {
    val mix = validMix()

    assertFailsWith<IllegalArgumentException> {
      mix.update(
        name = "Mezcla rota",
        organicPercentage = 30,
        mineralPercentage = 40,
        phMin = BigDecimal("5.5"),
        phMax = BigDecimal("6.5"),
        description = null,
      )
    }

    assertEquals("Mezcla original", mix.name, "el estado anterior debe quedar intacto")
    assertEquals(20, mix.organicPercentage)
    assertEquals(80, mix.mineralPercentage)
  }

  @Test
  fun `a correction with an inverted pH range is rejected`() {
    val mix = validMix()

    assertFailsWith<IllegalArgumentException> {
      mix.update(
        name = "Mezcla original",
        organicPercentage = 20,
        mineralPercentage = 80,
        phMin = BigDecimal("7.0"),
        phMax = BigDecimal("6.0"),
        description = null,
      )
    }

    assertEquals(BigDecimal("5.5"), mix.phMin)
  }

  @Test
  fun `a correction with a blank name is rejected`() {
    val mix = validMix()

    assertFailsWith<IllegalArgumentException> {
      mix.update(
        name = "   ",
        organicPercentage = 20,
        mineralPercentage = 80,
        phMin = BigDecimal("5.5"),
        phMax = BigDecimal("6.5"),
        description = null,
      )
    }

    assertEquals("Mezcla original", mix.name)
  }

  @Test
  fun `a valid correction applies every field, the description included`() {
    val mix = validMix()

    mix.update(
      name = "Mezcla corregida",
      organicPercentage = 40,
      mineralPercentage = 60,
      phMin = BigDecimal("6.0"),
      phMax = BigDecimal("7.0"),
      description = "turba, arena gruesa, perlita",
    )

    assertEquals("Mezcla corregida", mix.name)
    assertEquals(40, mix.organicPercentage)
    assertEquals(60, mix.mineralPercentage)
    assertEquals(BigDecimal("6.0"), mix.phMin)
    assertEquals(BigDecimal("7.0"), mix.phMax)
    assertEquals("turba, arena gruesa, perlita", mix.description)
  }

  /** Vaciar la descripción es un cambio legítimo, no un campo que se deja como estaba. */
  @Test
  fun `a correction can clear the description`() {
    val mix = validMix()

    mix.update(
      name = "Mezcla original",
      organicPercentage = 20,
      mineralPercentage = 80,
      phMin = BigDecimal("5.5"),
      phMax = BigDecimal("6.5"),
      description = null,
    )

    assertEquals(null, mix.description)
  }

  private fun validMix() = SoilMix(
    name = "Mezcla original",
    organicPercentage = 20,
    mineralPercentage = 80,
    phMin = BigDecimal("5.5"),
    phMax = BigDecimal("6.5"),
    description = "akadama, pómez, turba",
  )
}

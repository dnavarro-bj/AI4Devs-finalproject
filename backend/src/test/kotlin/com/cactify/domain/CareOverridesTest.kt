package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

/** Los cuidados propios y el perfil efectivo (ADR-011): lo propio si lo hay, lo de la especie si no. */
class CareOverridesTest {

  private val speciesMix = SoilMix(name = "Mineral", organicPercentage = 20, mineralPercentage = 80, phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"))
  private val ownMix = SoilMix(name = "Orgánico", organicPercentage = 60, mineralPercentage = 40, phMin = BigDecimal("5.8"), phMax = BigDecimal("6.8"))

  // Humedad 10-30, temperatura 10-35, luz 6-10.
  private val species = Species(
    code = "CAT-GRUSS", scientificName = "Echinocactus grusonii", commonName = "Asiento de suegra",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "cada 10-20 dias", soilMix = speciesMix,
  )

  // --- Regla de rangos compartida ---

  @Test
  fun `a coherent set of ranges passes`() {
    CareRanges.requireCoherent(10, 30, 10, 35, 6, 10)
    CareRanges.requireCoherent(10, 10, 10, 10, 6, 6)
  }

  @Test
  fun `each inverted range is rejected with its own message`() {
    val humidity = assertFailsWith<IllegalArgumentException> { CareRanges.requireCoherent(40, 30, 10, 35, 6, 10) }
    val temperature = assertFailsWith<IllegalArgumentException> { CareRanges.requireCoherent(10, 30, 40, 35, 6, 10) }
    val light = assertFailsWith<IllegalArgumentException> { CareRanges.requireCoherent(10, 30, 10, 35, 12, 10) }

    assertTrue(humidity.message!!.contains("humedad"))
    assertTrue(temperature.message!!.contains("temperatura"))
    assertTrue(light.message!!.contains("luz"))
  }

  // --- Cuidados propios ---

  @Test
  fun `an overrides object with no value is empty`() {
    assertTrue(CareOverrides().isEmpty)
    assertFalse(CareOverrides(wateringGuideline = "cada 5 dias").isEmpty)
  }

  @Test
  fun `without own values the effective profile is the species one and nothing is overridden`() {
    val effective = CareOverrides().effective(species)

    assertEquals(10, effective.minHumidity)
    assertEquals(30, effective.maxHumidity)
    assertEquals(35, effective.maxTemperature)
    assertEquals("cada 10-20 dias", effective.wateringGuideline)
    assertSame(speciesMix, effective.soilMix)
    assertEquals(emptyList(), effective.overridden)
  }

  @Test
  fun `an own value wins and the rest is inherited`() {
    val effective = CareOverrides(wateringGuideline = "cada 5 dias").effective(species)

    assertEquals("cada 5 dias", effective.wateringGuideline)
    assertEquals(10, effective.minHumidity)
    assertEquals(35, effective.maxTemperature)
    assertSame(speciesMix, effective.soilMix)
    assertEquals(listOf("wateringGuideline"), effective.overridden)
  }

  @Test
  fun `the list of overridden fields names exactly what departs from the species`() {
    val effective = CareOverrides(maxTemperature = 30, soilMix = ownMix).effective(species)

    assertEquals(listOf("maxTemperature", "soilMix"), effective.overridden)
    assertEquals(30, effective.maxTemperature)
    assertEquals(10, effective.minTemperature)
    assertSame(ownMix, effective.soilMix)
  }

  @Test
  fun `an own value equal to the species one still counts as overridden`() {
    val effective = CareOverrides(minHumidity = 10).effective(species)

    assertEquals(listOf("minHumidity"), effective.overridden)
  }

  @Test
  fun `a change in the species changes what is inherited but not what is own`() {
    val overrides = CareOverrides(wateringGuideline = "cada 5 dias")
    val other = Species(
      code = "CAT-MAMMI", scientificName = "Mammillaria elongata", commonName = "Dedo de dama",
      minHumidity = 15, maxHumidity = 40, minTemperature = 12, maxTemperature = 32,
      minLightHours = 5, maxLightHours = 9, wateringGuideline = "cada 7-14 dias", soilMix = speciesMix,
    )

    val effective = overrides.effective(other)

    assertEquals("cada 5 dias", effective.wateringGuideline)
    assertEquals(15, effective.minHumidity)
    assertEquals(40, effective.maxHumidity)
  }

  // --- Coherencia ---

  @Test
  fun `an own minimum above the inherited maximum is rejected`() {
    val error = assertFailsWith<IllegalArgumentException> { CareOverrides(minHumidity = 40).validateAgainst(species) }

    assertTrue(error.message!!.contains("humedad"))
  }

  @Test
  fun `an own maximum below the inherited minimum is rejected`() {
    val error = assertFailsWith<IllegalArgumentException> { CareOverrides(maxTemperature = 5).validateAgainst(species) }

    assertTrue(error.message!!.contains("temperatura"))
  }

  @Test
  fun `two own ends coherent with each other are accepted even if they depart from the species`() {
    CareOverrides(minLightHours = 2, maxLightHours = 4).validateAgainst(species)
  }

  @Test
  fun `two own ends inverted are rejected`() {
    assertFailsWith<IllegalArgumentException> { CareOverrides(minLightHours = 8, maxLightHours = 4).validateAgainst(species) }
  }

  @Test
  fun `values out of scale are rejected`() {
    assertFailsWith<IllegalArgumentException> { CareOverrides(maxHumidity = 120).validateAgainst(species) }
    assertFailsWith<IllegalArgumentException> { CareOverrides(minHumidity = -1).validateAgainst(species) }
    assertFailsWith<IllegalArgumentException> { CareOverrides(maxLightHours = 30).validateAgainst(species) }
  }

  @Test
  fun `a blank watering guideline counts as no own value`() {
    assertNull(CareOverrides(wateringGuideline = "   ").normalized())
    assertEquals("cada 5 dias", CareOverrides(wateringGuideline = "  cada 5 dias ").normalized()!!.wateringGuideline)
  }

  @Test
  fun `an empty object normalizes to null`() {
    assertNull(CareOverrides().normalized())
    assertNull(null.let { (it as CareOverrides?).normalized() })
  }
}

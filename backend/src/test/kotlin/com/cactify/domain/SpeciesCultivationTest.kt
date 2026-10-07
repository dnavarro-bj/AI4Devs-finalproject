package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Escenarios de «Ficha de cultivo de la especie» y «Calendario anual de la especie» en el dominio. */
class SpeciesCultivationTest {

  private val mix = SoilMix(name = "Mineral", organicPercentage = 20, mineralPercentage = 80, phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"))

  private fun species(profile: CultivationProfile = CultivationProfile(), periods: List<PeriodSpec> = emptyList()) = Species(
    code = "CAT-GRUSS", scientificName = "Echinocactus grusonii", commonName = "Asiento de suegra",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "cada 10-20 dias", soilMix = mix,
    profile = profile, periods = periods,
  )

  private fun period(type: PeriodType, from: Int, to: Int, intensity: WateringIntensity? = null, notes: String? = null) =
    PeriodSpec(type, from, to, intensity, notes)

  // --- Vocabularios ---

  @Test
  fun `the enums have explicit values`() {
    assertEquals(listOf("sombra", "semisombra", "soleado", "pleno_sol"), SunExposure.entries.map { it.value })
    assertEquals(listOf("interior", "exterior", "ambos"), Environment.entries.map { it.value })
    assertEquals(listOf("crecimiento", "crecimiento_maximo", "reposo", "floracion", "riego"), PeriodType.entries.map { it.value })
    assertEquals(listOf("escaso", "moderado", "abundante"), WateringIntensity.entries.map { it.value })
  }

  @Test
  fun `invoke normalizes and rejects the unknown`() {
    assertEquals(SunExposure.FullSun, SunExposure(" Pleno_Sol "))
    assertEquals(Environment.Both, Environment("AMBOS"))
    assertFailsWith<IllegalArgumentException> { SunExposure("radiante") }
    assertFailsWith<IllegalArgumentException> { Environment("estacional") }
    assertFailsWith<IllegalArgumentException> { PeriodType("transicion") }
    assertFailsWith<IllegalArgumentException> { WateringIntensity("torrencial") }
  }

  // --- Ficha de cultivo ---

  @Test
  fun `a species without cultivation data is valid and every field is undefined`() {
    val species = species()

    assertNull(species.sunExposure)
    assertNull(species.environment)
    assertNull(species.description)
    assertNull(species.bloomColor)
    assertTrue(species.periods.isEmpty())
  }

  @Test
  fun `exposure and light hours are independent`() {
    val species = species(CultivationProfile(sunExposure = SunExposure.Shade))

    assertEquals(SunExposure.Shade, species.sunExposure)
    assertEquals(10, species.maxLightHours)
  }

  @Test
  fun `blank texts are stored as undefined and the rest is trimmed`() {
    val species = species(CultivationProfile(description = "   ", bloomColor = " Amarillo "))

    assertNull(species.description)
    assertEquals("Amarillo", species.bloomColor)
  }

  // --- Periodos ---

  @Test
  fun `a period crossing the year covers both sides of december`() {
    assertEquals(setOf(11, 12, 1, 2), period(PeriodType.Dormancy, 11, 2).months)
    assertEquals(setOf(3, 4, 5), period(PeriodType.Growth, 3, 5).months)
    assertEquals(setOf(6), period(PeriodType.Flowering, 6, 6).months)
  }

  @Test
  fun `a crossing period is kept as one with start after end`() {
    val species = species(periods = listOf(period(PeriodType.Dormancy, 11, 2)))

    assertEquals(1, species.periods.size)
    assertEquals(11, species.periods[0].startMonth)
    assertEquals(2, species.periods[0].endMonth)
  }

  @Test
  fun `months outside 1 to 12 are rejected`() {
    assertFailsWith<IllegalArgumentException> { period(PeriodType.Growth, 13, 2) }
    assertFailsWith<IllegalArgumentException> { period(PeriodType.Growth, 1, 0) }
  }

  @Test
  fun `intensity is mandatory for watering and forbidden elsewhere`() {
    assertFailsWith<IllegalArgumentException> { period(PeriodType.Watering, 3, 5) }
    assertFailsWith<IllegalArgumentException> { period(PeriodType.Growth, 3, 5, WateringIntensity.Moderate) }
    period(PeriodType.Watering, 3, 5, WateringIntensity.Moderate)
  }

  @Test
  fun `periods of the same type cannot overlap`() {
    val error = assertFailsWith<IllegalArgumentException> {
      species(periods = listOf(period(PeriodType.Growth, 3, 7), period(PeriodType.Growth, 6, 10)))
    }
    assertTrue(error.message!!.contains("crecimiento"))
  }

  @Test
  fun `the overlap counts the year crossing`() {
    assertFailsWith<IllegalArgumentException> {
      species(periods = listOf(period(PeriodType.Dormancy, 11, 2), period(PeriodType.Dormancy, 1, 3)))
    }
  }

  @Test
  fun `adjacent periods of the same type are accepted`() {
    species(periods = listOf(period(PeriodType.Watering, 3, 5, WateringIntensity.Abundant), period(PeriodType.Watering, 6, 8, WateringIntensity.Sparse)))
  }

  @Test
  fun `different types may coincide`() {
    species(periods = listOf(period(PeriodType.Growth, 3, 10), period(PeriodType.Flowering, 5, 7)))
  }

  @Test
  fun `the growth peak overlaps the growth and may cover all or part of it`() {
    species(periods = listOf(period(PeriodType.Growth, 3, 10), period(PeriodType.GrowthPeak, 5, 7)))
    species(periods = listOf(period(PeriodType.Growth, 3, 10), period(PeriodType.GrowthPeak, 3, 10)))
  }

  @Test
  fun `the growth peak cannot fall outside the growth`() {
    val error = assertFailsWith<IllegalArgumentException> {
      species(periods = listOf(period(PeriodType.Growth, 3, 6), period(PeriodType.GrowthPeak, 5, 8)))
    }
    assertTrue(error.message!!.contains("julio"))
    assertFailsWith<IllegalArgumentException> { species(periods = listOf(period(PeriodType.GrowthPeak, 5, 7))) }
  }

  @Test
  fun `the growth peak may cross the year inside a growth that crosses it`() {
    species(periods = listOf(period(PeriodType.Growth, 10, 3), period(PeriodType.GrowthPeak, 12, 1)))
  }

  @Test
  fun `a rejected peak leaves the species untouched`() {
    val species = species(periods = listOf(period(PeriodType.Growth, 3, 10)))

    assertFailsWith<IllegalArgumentException> {
      species.update(
        code = "CAT-GRUSS", scientificName = "Echinocactus grusonii", commonName = "Asiento de suegra",
        minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
        minLightHours = 6, maxLightHours = 10, wateringGuideline = "x", soilMix = mix,
        periods = listOf(period(PeriodType.Growth, 3, 5), period(PeriodType.GrowthPeak, 8, 9)),
      )
    }

    assertEquals(listOf(PeriodType.Growth to 3), species.periods.map { it.type to it.startMonth })
  }

  @Test
  fun `periods come ordered by type and start month`() {
    val species = species(
      periods = listOf(
        period(PeriodType.Flowering, 5, 7),
        period(PeriodType.Growth, 9, 10),
        period(PeriodType.Growth, 3, 5),
      ),
    )

    assertEquals(listOf(PeriodType.Growth to 3, PeriodType.Growth to 9, PeriodType.Flowering to 5), species.periods.map { it.type to it.startMonth })
  }

  // --- Reemplazo ---

  @Test
  fun `update replaces the calendar`() {
    val species = species(periods = listOf(period(PeriodType.Growth, 3, 5), period(PeriodType.Dormancy, 11, 2)))

    species.update(
      code = "CAT-GRUSS", scientificName = "Echinocactus grusonii", commonName = "Asiento de suegra",
      minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
      minLightHours = 6, maxLightHours = 10, wateringGuideline = "cada 10-20 dias", soilMix = mix,
      periods = listOf(period(PeriodType.Flowering, 5, 7)),
    )

    assertEquals(listOf(PeriodType.Flowering), species.periods.map { it.type })
  }

  @Test
  fun `a rejected update leaves the species untouched`() {
    val species = species(
      profile = CultivationProfile(sunExposure = SunExposure.FullSun),
      periods = listOf(period(PeriodType.Growth, 3, 5)),
    )

    assertFailsWith<IllegalArgumentException> {
      species.update(
        code = "CAT-GRUSS", scientificName = "Otro nombre", commonName = "Otro",
        minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
        minLightHours = 6, maxLightHours = 10, wateringGuideline = "x", soilMix = mix,
        profile = CultivationProfile(sunExposure = SunExposure.Shade),
        periods = listOf(period(PeriodType.Growth, 3, 7), period(PeriodType.Growth, 6, 9)),
      )
    }

    assertEquals("Echinocactus grusonii", species.scientificName)
    assertEquals(SunExposure.FullSun, species.sunExposure)
    assertEquals(1, species.periods.size)
  }
}

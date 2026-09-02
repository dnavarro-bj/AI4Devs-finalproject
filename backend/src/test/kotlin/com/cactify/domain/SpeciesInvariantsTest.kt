package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Invariantes de `Species`, incluidos los escenarios de "Restricciones de dominio de las especies". */
class SpeciesInvariantsTest {

  private val soilMix = SoilMix(
    name = "Sustrato de prueba",
    organicPercentage = 40,
    mineralPercentage = 60,
    phMin = BigDecimal("5.5"),
    phMax = BigDecimal("6.5"),
  )

  private fun species(
    scientificName: String = "Echinocactus grusonii",
    commonName: String = "Asiento de suegra",
    minHumidity: Int = 10,
    maxHumidity: Int = 30,
    minTemperature: Int = 10,
    maxTemperature: Int = 35,
    minLightHours: Int = 6,
    maxLightHours: Int = 10,
    wateringGuideline: String = "cada 10-20 dias",
  ) = Species(
    scientificName = scientificName,
    commonName = commonName,
    minHumidity = minHumidity,
    maxHumidity = maxHumidity,
    minTemperature = minTemperature,
    maxTemperature = maxTemperature,
    minLightHours = minLightHours,
    maxLightHours = maxLightHours,
    wateringGuideline = wateringGuideline,
    soilMix = soilMix,
  )

  @Test
  fun `an inverted humidity range cannot be created`() {
    assertFailsWith<IllegalArgumentException> { species(minHumidity = 80, maxHumidity = 10) }
  }

  @Test
  fun `an inverted temperature range cannot be created`() {
    assertFailsWith<IllegalArgumentException> { species(minTemperature = 35, maxTemperature = 10) }
  }

  @Test
  fun `an inverted light hours range cannot be created`() {
    assertFailsWith<IllegalArgumentException> { species(minLightHours = 10, maxLightHours = 6) }
  }

  @Test
  fun `a range with both ends equal is valid`() {
    val s = species(minHumidity = 20, maxHumidity = 20)

    assertEquals(20, s.minHumidity)
    assertEquals(20, s.maxHumidity)
  }

  @Test
  fun `a species without a scientific name cannot be created`() {
    assertFailsWith<IllegalArgumentException> { species(scientificName = "  ") }
  }

  @Test
  fun `a species without a common name cannot be created`() {
    assertFailsWith<IllegalArgumentException> { species(commonName = "") }
  }

  @Test
  fun `a species without a watering guideline cannot be created`() {
    assertFailsWith<IllegalArgumentException> { species(wateringGuideline = "   ") }
  }
}

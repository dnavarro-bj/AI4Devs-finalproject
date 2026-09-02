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

  @Test
  fun `updating with an inverted range is rejected and the species keeps its values`() {
    val s = species(minHumidity = 10, maxHumidity = 30)

    assertFailsWith<IllegalArgumentException> {
      s.update(
        scientificName = "Echinocactus grusonii",
        commonName = "Asiento de suegra",
        minHumidity = 40,
        maxHumidity = 20,
        minTemperature = 10,
        maxTemperature = 35,
        minLightHours = 6,
        maxLightHours = 10,
        wateringGuideline = "cada 10-20 dias",
        soilMix = soilMix,
      )
    }

    assertEquals(10, s.minHumidity, "la especie no debía quedar a medio actualizar")
    assertEquals(30, s.maxHumidity, "la especie no debía quedar a medio actualizar")
  }

  @Test
  fun `updating with a blank watering guideline is rejected`() {
    val s = species()

    assertFailsWith<IllegalArgumentException> {
      s.update(
        scientificName = "Echinocactus grusonii",
        commonName = "Asiento de suegra",
        minHumidity = 10,
        maxHumidity = 30,
        minTemperature = 10,
        maxTemperature = 35,
        minLightHours = 6,
        maxLightHours = 10,
        wateringGuideline = "   ",
        soilMix = soilMix,
      )
    }

    assertEquals("cada 10-20 dias", s.wateringGuideline)
  }

  @Test
  fun `a valid update replaces every field`() {
    val s = species()

    s.update(
      scientificName = "Ferocactus glaucescens",
      commonName = "Biznaga azul",
      minHumidity = 15,
      maxHumidity = 35,
      minTemperature = 8,
      maxTemperature = 30,
      minLightHours = 5,
      maxLightHours = 9,
      wateringGuideline = "cada 20 dias en crecimiento",
      soilMix = soilMix,
    )

    assertEquals("Ferocactus glaucescens", s.scientificName)
    assertEquals("Biznaga azul", s.commonName)
    assertEquals(15, s.minHumidity)
    assertEquals(35, s.maxHumidity)
    assertEquals(8, s.minTemperature)
    assertEquals(30, s.maxTemperature)
    assertEquals(5, s.minLightHours)
    assertEquals(9, s.maxLightHours)
    assertEquals("cada 20 dias en crecimiento", s.wateringGuideline)
  }
}

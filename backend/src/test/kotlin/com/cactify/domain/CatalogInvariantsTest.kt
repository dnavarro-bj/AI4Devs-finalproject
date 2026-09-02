package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Invariantes de `Location`, `Tag`, `Plant` y `AIRecommendation`: sus textos obligatorios. */
class CatalogInvariantsTest {

  private val soilMix = SoilMix(
    name = "Sustrato", organicPercentage = 40, mineralPercentage = 60,
    phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"),
  )
  private val species = Species(
    scientificName = "Testus plantus", commonName = "Planta de prueba",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "semanal", soilMix = soilMix,
  )
  private val location = Location(name = "Invernadero 1")
  private val clock = Clock.fixed(Instant.parse("2026-08-14T09:30:00Z"), ZoneOffset.UTC)

  @Test
  fun `a location without a name cannot be created`() {
    assertFailsWith<IllegalArgumentException> { Location(name = "   ") }
  }

  @Test
  fun `a tag without a name cannot be created`() {
    assertFailsWith<IllegalArgumentException> { Tag(name = "") }
  }

  @Test
  fun `a plant without a nickname cannot be created`() {
    assertFailsWith<IllegalArgumentException> {
      Plant(nickname = "  ", location = location, species = species)
    }
  }

  @Test
  fun `an AI recommendation without a risk level or a text cannot be created`() {
    val plant = Plant(nickname = "Bola", location = location, species = species)
    val record = CareRecord.record(plant = plant, humidity = 35, recordedAt = null, clock = clock, maxFutureSkew = java.time.Duration.ofMinutes(5))

    assertFailsWith<IllegalArgumentException> {
      AIRecommendation(careRecord = record, riskLevel = " ", recommendationText = "Riega")
    }
    assertFailsWith<IllegalArgumentException> {
      AIRecommendation(careRecord = record, riskLevel = "alto", recommendationText = "")
    }
  }

  @Test
  fun `valid catalog entities are built`() {
    assertEquals("Invernadero 1", Location(name = "Invernadero 1").name)
    assertEquals("globular", Tag(name = "globular").name)
    assertEquals("Bola", Plant(nickname = "Bola", location = location, species = species).nickname)
  }
}

package com.cactify.domain

import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/** `Plant.moveTo`: el cambio de sitio y su movimiento salen del mismo método. */
class PlantMoveTest {

  private val clock = Clock.fixed(Instant.parse("2026-10-07T10:15:30.123456789Z"), ZoneOffset.UTC)
  private val soilMix = SoilMix(name = "M", organicPercentage = 20, mineralPercentage = 80, phMin = java.math.BigDecimal("5.8"), phMax = java.math.BigDecimal("6.8"))
  private val species = Species(
    code = "CAT-TEST", scientificName = "Test testus", commonName = "Test",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "cada 10 dias", soilMix = soilMix,
  )
  private val origin = Location(name = "Invernadero 1", code = "LOC-I1")
  private val destination = Location(name = "Bandeja A3", code = "LOC-A3")
  private val plant = Plant(code = "CAT-TEST-01", nickname = "Bola", location = origin, species = species)

  @Test
  fun `moving changes the location and returns the movement with its origin, destination and instant`() {
    val movement = plant.moveTo(destination, clock)

    assertNotNull(movement)
    assertEquals(destination, plant.location)
    assertEquals(origin, movement.fromLocation)
    assertEquals(destination, movement.toLocation)
    assertEquals(plant, movement.plant)
    assertEquals(Instant.parse("2026-10-07T10:15:30.123456Z"), movement.movedAt, "a microsegundos")
  }

  @Test
  fun `moving to where the plant already is returns nothing`() {
    assertNull(plant.moveTo(origin, clock))
    assertEquals(origin, plant.location)
  }

  @Test
  fun `a movement needs two distinct locations`() {
    assertFailsWith<IllegalArgumentException> { PlantMovement.record(plant, origin, origin, clock.instant()) }
  }
}

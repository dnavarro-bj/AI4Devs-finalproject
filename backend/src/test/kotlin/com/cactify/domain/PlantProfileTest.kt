package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

/** La ficha ampliada y el cambio de estado, en el dominio (ADR-011): todo o nada. */
class PlantProfileTest {

  private val soilMix = SoilMix(
    name = "Sustrato",
    organicPercentage = 40,
    mineralPercentage = 60,
    phMin = BigDecimal("5.5"),
    phMax = BigDecimal("6.5"),
  )
  private val species = Species(
    code = "CAT-GRUSS", scientificName = "Echinocactus grusonii", commonName = "Asiento de suegra",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "cada 10 dias", soilMix = soilMix,
  )
  private val location = Location(name = "Invernadero 1")
  private val clock: Clock = Clock.fixed(Instant.parse("2026-10-07T10:00:00Z"), ZoneOffset.UTC)

  private fun plant(
    status: PlantStatus = PlantStatus.Active,
    description: String? = null,
    year: Int? = null,
    month: Int? = null,
  ) = Plant(
    code = "CAT-GRUSS-01", nickname = "Bola", location = location, species = species,
    description = description, status = status, germinationYear = year, germinationMonth = month,
  )

  // --- Ficha ---

  @Test
  fun `a plant without the optional profile is active and has nothing invented`() {
    val plant = plant()

    assertEquals(PlantStatus.Active, plant.status)
    assertNull(plant.description)
    assertNull(plant.germinationYear)
    assertNull(plant.germinationMonth)
    assertNull(plant.acquiredOn)
    assertNull(plant.origin)
    assertNull(plant.originNote)
  }

  @Test
  fun `a full profile is kept`() {
    val plant = Plant(
      code = "CAT-GRUSS-01", nickname = "Bola", location = location, species = species,
      description = "Ejemplar adulto", status = PlantStatus.Quarantine,
      germinationYear = 2021, germinationMonth = 4, acquiredOn = LocalDate.of(2022, 3, 1),
      origin = PlantOrigin.Exchange, originNote = "Con un vecino",
    )

    assertEquals("Ejemplar adulto", plant.description)
    assertEquals(2021, plant.germinationYear)
    assertEquals(4, plant.germinationMonth)
    assertEquals(LocalDate.of(2022, 3, 1), plant.acquiredOn)
    assertEquals(PlantOrigin.Exchange, plant.origin)
    assertEquals("Con un vecino", plant.originNote)
  }

  @Test
  fun `a year without a month is valid`() {
    val plant = plant(year = 2021, month = null)

    assertEquals(2021, plant.germinationYear)
    assertNull(plant.germinationMonth)
  }

  @Test
  fun `a month without a year is rejected`() {
    assertFailsWith<IllegalArgumentException> { plant(year = null, month = 4) }
  }

  @Test
  fun `a month out of range is rejected`() {
    assertFailsWith<IllegalArgumentException> { plant(year = 2021, month = 0) }
    assertFailsWith<IllegalArgumentException> { plant(year = 2021, month = 13) }
  }

  @Test
  fun `an implausible year is rejected`() {
    assertFailsWith<IllegalArgumentException> { plant(year = 1899) }
    assertFailsWith<IllegalArgumentException> { plant(year = 2101) }
  }

  @Test
  fun `a blank description or note is stored as absent`() {
    assertNull(plant(description = "   ").description)
    assertEquals("Texto", plant(description = "  Texto  ").description)
  }

  @Test
  fun `a plant cannot be born in a final status`() {
    for (status in PlantStatus.entries.filter { it.isFinal }) {
      assertFailsWith<IllegalArgumentException>("nacer $status debía rechazarse") { plant(status = status) }
    }
  }

  @Test
  fun `updating replaces the whole profile or nothing`() {
    val plant = plant(description = "Antigua", year = 2020, month = 5)

    assertFailsWith<IllegalArgumentException> {
      plant.update(
        nickname = "Nueva", location = location, species = species,
        description = "Nueva", germinationYear = null, germinationMonth = 4,
        acquiredOn = null, origin = null, originNote = null, careOverrides = null,
      )
    }

    assertEquals("Bola", plant.nickname, "el estado anterior debe quedar intacto")
    assertEquals("Antigua", plant.description)
    assertEquals(2020, plant.germinationYear)
  }

  @Test
  fun `updating without the optional fields clears them`() {
    val plant = plant(description = "Antigua", year = 2020, month = 5)

    plant.update(
      nickname = "Bola", location = location, species = species,
      description = null, germinationYear = null, germinationMonth = null,
      acquiredOn = null, origin = null, originNote = null, careOverrides = null,
    )

    assertNull(plant.description)
    assertNull(plant.germinationYear)
  }

  // --- Estado ---

  @Test
  fun `changing the status returns the record and updates the plant`() {
    val plant = plant()

    val change = plant.changeStatus(PlantStatus.Quarantine, "Sospecha de cochinilla", clock)

    assertEquals(PlantStatus.Quarantine, plant.status)
    assertSame(plant, change.plant)
    assertEquals(PlantStatus.Active, change.fromStatus)
    assertEquals(PlantStatus.Quarantine, change.toStatus)
    assertEquals("Sospecha de cochinilla", change.reason)
    assertEquals(Instant.parse("2026-10-07T10:00:00Z"), change.occurredAt)
  }

  @Test
  fun `the reason is optional and a blank one is stored as absent`() {
    val plant = plant()

    assertNull(plant.changeStatus(PlantStatus.Sick, null, clock).reason)
    assertNull(plant.changeStatus(PlantStatus.Quarantine, "   ", clock).reason)
  }

  @Test
  fun `an invalid transition changes nothing`() {
    val plant = plant()
    plant.changeStatus(PlantStatus.Dead, null, clock)

    assertFailsWith<InvalidPlantStatusTransitionException> { plant.changeStatus(PlantStatus.Sold, "x", clock) }

    assertEquals(PlantStatus.Dead, plant.status)
  }

  @Test
  fun `moving to the same status is rejected`() {
    val plant = plant()

    assertFailsWith<InvalidPlantStatusTransitionException> { plant.changeStatus(PlantStatus.Active, null, clock) }
  }

  @Test
  fun `going back to active from a final status needs a reason`() {
    val plant = plant()
    plant.changeStatus(PlantStatus.Dead, null, clock)

    assertFailsWith<IllegalArgumentException> { plant.changeStatus(PlantStatus.Active, null, clock) }
    assertFailsWith<IllegalArgumentException> { plant.changeStatus(PlantStatus.Active, "  ", clock) }
    assertEquals(PlantStatus.Dead, plant.status)

    val correction = plant.changeStatus(PlantStatus.Active, "Era un error", clock)
    assertEquals(PlantStatus.Active, plant.status)
    assertEquals("Era un error", correction.reason)
  }

  @Test
  fun `the code never changes with the status`() {
    val plant = plant()

    plant.changeStatus(PlantStatus.Sold, null, clock)
    plant.changeStatus(PlantStatus.Active, "Devuelta", clock)

    assertEquals("CAT-GRUSS-01", plant.code)
    assertTrue(plant.status == PlantStatus.Active)
  }
}

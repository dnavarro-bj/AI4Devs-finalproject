package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals

/**
 * Invariantes de los códigos de inventario en el dominio (ADR-011): el formato, la asignación del
 * número de ejemplar y la inmutabilidad del código de una planta.
 */
class InventoryCodeTest {

  private val soilMix = SoilMix(
    name = "Sustrato de prueba",
    organicPercentage = 40,
    mineralPercentage = 60,
    phMin = BigDecimal("5.5"),
    phMax = BigDecimal("6.5"),
  )

  private fun species(code: String = "CAT-GRUSS") = Species(
    code = code,
    scientificName = "Echinocactus grusonii",
    commonName = "Asiento de suegra",
    minHumidity = 10,
    maxHumidity = 30,
    minTemperature = 10,
    maxTemperature = 35,
    minLightHours = 6,
    maxLightHours = 10,
    wateringGuideline = "cada 10-20 dias",
    soilMix = soilMix,
  )

  @Test
  fun `a species code with a valid format is accepted`() {
    assertEquals("CAT-GRUSS", species("CAT-GRUSS").code)
    assertEquals("A1", species("A1").code)
    assertEquals("CAT-ECHIN2", species("CAT-ECHIN2").code)
  }

  @Test
  fun `a species code with an invalid format is rejected`() {
    for (invalid in listOf("", "   ", "cat-gruss", "CAT GRUSS", "CAT_GRUSS", "-CAT", "CAT-", "CAT--X", "A".repeat(21))) {
      assertFailsWith<IllegalArgumentException>("«$invalid» debía rechazarse") { species(invalid) }
    }
  }

  @Test
  fun `updating the code revalidates it and leaves the species untouched on failure`() {
    val species = species("CAT-GRUSS")

    assertFailsWith<IllegalArgumentException> {
      species.update(
        code = "mal formato",
        scientificName = "Echinocactus grusonii",
        commonName = "Otro nombre",
        minHumidity = 10,
        maxHumidity = 30,
        minTemperature = 10,
        maxTemperature = 35,
        minLightHours = 6,
        maxLightHours = 10,
        wateringGuideline = "cada 10-20 dias",
        soilMix = soilMix,
      )
    }

    assertEquals("CAT-GRUSS", species.code)
    assertEquals("Asiento de suegra", species.commonName, "el estado anterior debe quedar intacto")
  }

  @Test
  fun `the next plant code uses two digits and advances the counter`() {
    val species = species("CAT-GRUSS")

    assertEquals("CAT-GRUSS-01", species.nextPlantCode())
    assertEquals("CAT-GRUSS-02", species.nextPlantCode())
    assertEquals(3, species.nextSequence)
  }

  @Test
  fun `the plant number grows beyond two digits`() {
    val species = species("CAT-GRUSS")
    repeat(98) { species.nextPlantCode() }

    assertEquals("CAT-GRUSS-99", species.nextPlantCode())
    assertEquals("CAT-GRUSS-100", species.nextPlantCode())
    assertEquals("CAT-GRUSS-101", species.nextPlantCode())
  }

  @Test
  fun `a plant needs a code with a valid format`() {
    val location = Location(name = "Invernadero 1")
    val species = species()

    assertFailsWith<IllegalArgumentException> { Plant(code = "", nickname = "Bola", location = location, species = species) }
    assertFailsWith<IllegalArgumentException> { Plant(code = "mal", nickname = "Bola", location = location, species = species) }
  }

  @Test
  fun `updating a plant does not change its code, not even when the species changes`() {
    val location = Location(name = "Invernadero 1")
    val grusonii = species("CAT-GRUSS")
    val other = species("CAT-MAMMI")
    val plant = Plant(code = grusonii.nextPlantCode(), nickname = "Bola", location = location, species = grusonii)

    plant.update(nickname = "Bola 2", location = location, species = other)

    assertEquals("CAT-GRUSS-01", plant.code)
    assertNotEquals(other.code, plant.code.substringBeforeLast('-'))
  }
}

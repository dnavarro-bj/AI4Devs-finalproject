package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertSame

/**
 * «Edición de una planta» en el dominio: la entidad protege su consistencia también al cambiar, y
 * el cambio es todo o nada (ADR-011).
 */
class PlantUpdateTest {

  private val soilMix = SoilMix(
    name = "Sustrato de prueba",
    organicPercentage = 40,
    mineralPercentage = 60,
    phMin = BigDecimal("5.5"),
    phMax = BigDecimal("6.5"),
  )

  private fun species(name: String) = Species(
    scientificName = name,
    commonName = "Común de $name",
    minHumidity = 10,
    maxHumidity = 30,
    minTemperature = 10,
    maxTemperature = 35,
    minLightHours = 6,
    maxLightHours = 10,
    wateringGuideline = "cada 10-20 dias",
    soilMix = soilMix,
  )

  private val greenhouse = Location(name = "Invernadero 1")
  private val tray = Location(name = "Bandeja A3")
  private val grusonii = species("Echinocactus grusonii")
  private val elongata = species("Mammillaria elongata")

  private fun plant() = Plant(nickname = "Bola 1", location = greenhouse, species = grusonii)

  @Test
  fun `updating changes the three fields`() {
    val plant = plant()

    plant.update(nickname = "Bola 2", location = tray, species = elongata)

    assertEquals("Bola 2", plant.nickname)
    assertSame(tray, plant.location)
    assertSame(elongata, plant.species)
  }

  @Test
  fun `updating keeps the identity of the plant`() {
    val plant = plant()
    val id = plant.id

    plant.update(nickname = "Bola 2", location = tray, species = elongata)

    assertEquals(id, plant.id)
  }

  @Test
  fun `a blank nickname is rejected and nothing is applied`() {
    val plant = plant()

    assertFailsWith<IllegalArgumentException> {
      plant.update(nickname = "   ", location = tray, species = elongata)
    }

    assertEquals("Bola 1", plant.nickname)
    assertSame(greenhouse, plant.location, "el estado anterior debe quedar intacto")
    assertSame(grusonii, plant.species, "el estado anterior debe quedar intacto")
  }

  @Test
  fun `the tags are not touched by an update`() {
    val plant = plant()
    val tag = Tag(name = "globular")
    plant.updateTags(setOf(tag))

    plant.update(nickname = "Bola 2", location = tray, species = elongata)

    assertEquals(setOf(tag), plant.tags)
  }
}

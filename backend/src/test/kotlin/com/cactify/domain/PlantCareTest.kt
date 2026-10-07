package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** El ejemplar y sus cuidados propios: se validan contra su especie en el alta, en la edición y al cambiarla. */
class PlantCareTest {

  private val mix = SoilMix(name = "Mineral", organicPercentage = 20, mineralPercentage = 80, phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"))
  private fun species(code: String, minH: Int, maxH: Int) = Species(
    code = code, scientificName = "Especie $code", commonName = "Común",
    minHumidity = minH, maxHumidity = maxH, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "cada 10 dias", soilMix = mix,
  )

  private val dry = species("CAT-SECA", 10, 30)
  private val humid = species("CAT-HUME", 50, 90)
  private val location = Location(name = "Invernadero 1", code = com.cactify.locationCode("Invernadero 1"))

  private fun plant(species: Species = dry, care: CareOverrides? = null) =
    Plant(code = "CAT-SECA-01", nickname = "Bola", location = location, species = species, careOverrides = care)

  private fun replace(plant: Plant, species: Species, care: CareOverrides?) = plant.update(
    nickname = "Bola", location = location, species = species,
    description = null, germinationYear = null, germinationMonth = null,
    acquiredOn = null, origin = null, originNote = null, careOverrides = care,
  )

  @Test
  fun `a plant without own care has none and inherits everything`() {
    val plant = plant()

    assertNull(plant.careOverrides)
    assertEquals(emptyList(), plant.effectiveCare().overridden)
  }

  @Test
  fun `an empty overrides object is stored as none`() {
    assertNull(plant(care = CareOverrides()).careOverrides)
  }

  @Test
  fun `own care is kept and resolved`() {
    val plant = plant(care = CareOverrides(wateringGuideline = "cada 5 dias"))

    assertEquals("cada 5 dias", plant.effectiveCare().wateringGuideline)
  }

  @Test
  fun `an incoherent own care cannot create a plant`() {
    assertFailsWith<IllegalArgumentException> { plant(care = CareOverrides(minHumidity = 60)) }
  }

  @Test
  fun `updating replaces the own care entirely`() {
    val plant = plant(care = CareOverrides(minHumidity = 12, wateringGuideline = "cada 5 dias"))

    replace(plant, dry, CareOverrides(maxTemperature = 30))

    assertNull(plant.careOverrides!!.minHumidity)
    assertNull(plant.careOverrides!!.wateringGuideline)
    assertEquals(30, plant.careOverrides!!.maxTemperature)
  }

  @Test
  fun `updating without own care removes them all`() {
    val plant = plant(care = CareOverrides(wateringGuideline = "cada 5 dias"))

    replace(plant, dry, null)

    assertNull(plant.careOverrides)
  }

  @Test
  fun `changing the species keeps the own care`() {
    val plant = plant(care = CareOverrides(wateringGuideline = "cada 5 dias"))

    replace(plant, humid, plant.careOverrides)

    assertEquals("cada 5 dias", plant.careOverrides!!.wateringGuideline)
    assertEquals(50, plant.effectiveCare().minHumidity)
  }

  @Test
  fun `a change of species that makes the own care incoherent is rejected and changes nothing`() {
    val plant = plant(care = CareOverrides(minHumidity = 25))
    // La especie nueva admite 10 a 20: el mínimo propio de 25 la rompe.
    val narrow = species("CAT-ESTR", 10, 20)

    val error = assertFailsWith<IllegalArgumentException> { replace(plant, narrow, plant.careOverrides) }

    assertTrue(error.message!!.contains("no encajan"))
    assertEquals(dry, plant.species)
    assertEquals(25, plant.careOverrides!!.minHumidity)
  }

  @Test
  fun `an incoherent update changes nothing, not even the nickname`() {
    val plant = plant()

    assertFailsWith<IllegalArgumentException> {
      plant.update(
        nickname = "Nuevo", location = location, species = dry,
        description = "x", germinationYear = null, germinationMonth = null,
        acquiredOn = null, origin = null, originNote = null,
        careOverrides = CareOverrides(minHumidity = 60),
      )
    }

    assertEquals("Bola", plant.nickname)
    assertNull(plant.description)
  }
}

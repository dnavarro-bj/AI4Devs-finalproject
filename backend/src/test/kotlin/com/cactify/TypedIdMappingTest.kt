package com.cactify

import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.Location
import com.cactify.domain.Plant
import com.cactify.domain.SoilMix
import com.cactify.domain.Species
import com.cactify.domain.Tag
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/**
 * Cada entidad se persiste y se recupera por su identificador tipado sobre PostgreSQL real.
 * Es la red que detecta un `AttributeConverter` que no se ha registrado (decisión 3 del design):
 * sin él la entidad ni siquiera mapea, y con él la columna `BIGINT` sigue llevando el mismo valor.
 */
class TypedIdMappingTest : AbstractIntegrationTest() {

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private fun newSoilMix(name: String) =
    SoilMix(name = name, organicPercentage = 40, mineralPercentage = 60, phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"))

  private fun newSpecies(soilMix: SoilMix, scientificName: String) =
    Species(
      scientificName = scientificName, commonName = "Test plant",
      minHumidity = 10, maxHumidity = 20, minTemperature = 10, maxTemperature = 20,
      minLightHours = 6, maxLightHours = 10, wateringGuideline = "weekly", soilMix = soilMix,
    )

  @Test
  fun `a soil mix round-trips through its typed identifier`() {
    val soilMix = newSoilMix("Typed mix")
    entityManager.persist(soilMix)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(SoilMix::class.java, soilMix.id)

    assertNotNull(reloaded)
    assertEquals("Typed mix", reloaded.name)
    assertEquals(soilMix.id, reloaded.id)
  }

  @Test
  fun `a species round-trips through its typed identifier`() {
    val soilMix = newSoilMix("Typed mix for species")
    val species = newSpecies(soilMix, "Typedus speciesus")
    entityManager.persist(soilMix)
    entityManager.persist(species)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Species::class.java, species.id)

    assertNotNull(reloaded)
    assertEquals("Typedus speciesus", reloaded.scientificName)
    assertEquals(species.id, reloaded.id)
  }

  @Test
  fun `a location round-trips through its typed identifier`() {
    val location = Location(name = "Typed location")
    entityManager.persist(location)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Location::class.java, location.id)

    assertNotNull(reloaded)
    assertEquals("Typed location", reloaded.name)
    assertEquals(location.id, reloaded.id)
  }

  @Test
  fun `a tag round-trips through its typed identifier`() {
    val tag = Tag(name = "typed-tag")
    entityManager.persist(tag)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Tag::class.java, tag.id)

    assertNotNull(reloaded)
    assertEquals("typed-tag", reloaded.name)
    assertEquals(tag.id, reloaded.id)
  }

  @Test
  fun `a plant round-trips through its typed identifier`() {
    val soilMix = newSoilMix("Typed mix for plant")
    val species = newSpecies(soilMix, "Typedus plantus")
    val location = Location(name = "Typed plant location")
    val plant = Plant(nickname = "Pepito tipado", location = location, species = species)
    entityManager.persist(soilMix)
    entityManager.persist(species)
    entityManager.persist(location)
    entityManager.persist(plant)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Plant::class.java, plant.id)

    assertNotNull(reloaded)
    assertEquals("Pepito tipado", reloaded.nickname)
    assertEquals(plant.id, reloaded.id)
    assertEquals(location.id, reloaded.location.id)
    assertEquals(species.id, reloaded.species.id)
  }

  @Test
  fun `a care record and an AI recommendation round-trip through their typed identifiers`() {
    val soilMix = newSoilMix("Typed mix for care")
    val species = newSpecies(soilMix, "Typedus carus")
    val location = Location(name = "Typed care location")
    val plant = Plant(nickname = "Juanito tipado", location = location, species = species)
    val careRecord = CareRecord(plant = plant, humidity = 40, temperature = 22, lightHours = 8, recordedAt = Instant.now())
    val recommendation = AIRecommendation(careRecord = careRecord, riskLevel = "bajo", recommendationText = "Todo correcto")

    entityManager.persist(soilMix)
    entityManager.persist(species)
    entityManager.persist(location)
    entityManager.persist(plant)
    entityManager.persist(careRecord)
    entityManager.persist(recommendation)
    entityManager.flush()
    entityManager.clear()

    val reloadedCareRecord = entityManager.find(CareRecord::class.java, careRecord.id)
    val reloadedRecommendation = entityManager.find(AIRecommendation::class.java, recommendation.id)

    assertNotNull(reloadedCareRecord)
    assertEquals(careRecord.id, reloadedCareRecord.id)
    assertNotNull(reloadedRecommendation)
    assertEquals(recommendation.id, reloadedRecommendation.id)
    assertEquals(careRecord.id, reloadedRecommendation.careRecord.id)
  }

  @Test
  fun `a typed identifier keeps the same numeric value in its BIGINT column`() {
    val location = Location(name = "Typed numeric location")
    entityManager.persist(location)
    entityManager.flush()

    val storedId = entityManager
      .createNativeQuery("SELECT id FROM location WHERE name = 'Typed numeric location'")
      .singleResult as Number

    assertEquals(location.id.toString(), storedId.toLong().toString())
  }
}

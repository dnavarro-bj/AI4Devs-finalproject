package com.cactify

import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.Location
import com.cactify.domain.Plant
import com.cactify.domain.PlantTag
import com.cactify.domain.PlantTagId
import com.cactify.domain.SoilMix
import com.cactify.domain.Species
import com.cactify.domain.Tag
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.OffsetDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class RelationshipMappingTest : AbstractIntegrationTest() {

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `plant, tag and their many-to-many association round-trip through the composite key`() {
    val soilMix = SoilMix(name = "Test mix", organicPercentage = 40, mineralPercentage = 60, phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"))
    val species = Species(
      scientificName = "Testus plantus", commonName = "Test plant",
      minHumidity = 10, maxHumidity = 20, minTemperature = 10, maxTemperature = 20,
      minLightHours = 6, maxLightHours = 10, wateringGuideline = "weekly", soilMix = soilMix,
    )
    val location = Location(name = "Test location")
    val plant = Plant(nickname = "Pepito", location = location, species = species)
    val tag = Tag(name = "test-relationship-tag")
    val plantTag = PlantTag(plant = plant, tag = tag)

    entityManager.persist(soilMix)
    entityManager.persist(species)
    entityManager.persist(location)
    entityManager.persist(plant)
    entityManager.persist(tag)
    entityManager.persist(plantTag)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(PlantTag::class.java, PlantTagId(plant.id, tag.id))

    assertNotNull(reloaded, "expected the plant_tag composite key mapping to round-trip")
    assertEquals("Pepito", reloaded.plant.nickname)
    assertEquals("test-relationship-tag", reloaded.tag.name)
  }

  @Test
  fun `a care record and its AI recommendation round-trip back to their plant`() {
    val soilMix = SoilMix(name = "Test mix 2", organicPercentage = 30, mineralPercentage = 70, phMin = BigDecimal("6.0"), phMax = BigDecimal("7.0"))
    val species = Species(
      scientificName = "Testus secundus", commonName = "Test plant 2",
      minHumidity = 15, maxHumidity = 25, minTemperature = 12, maxTemperature = 22,
      minLightHours = 5, maxLightHours = 9, wateringGuideline = "biweekly", soilMix = soilMix,
    )
    val location = Location(name = "Test location 2")
    val plant = Plant(nickname = "Juanito", location = location, species = species)
    val careRecord = CareRecord(plant = plant, humidity = 40, temperature = 22, lightHours = 8, waterAmountMl = 150, soilPh = BigDecimal("6.2"), recordedAt = OffsetDateTime.now())
    val recommendation = AIRecommendation(careRecord = careRecord, riskLevel = "bajo", recommendationText = "Todo correcto")

    entityManager.persist(soilMix)
    entityManager.persist(species)
    entityManager.persist(location)
    entityManager.persist(plant)
    entityManager.persist(careRecord)
    entityManager.persist(recommendation)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(AIRecommendation::class.java, recommendation.id)

    assertNotNull(reloaded, "expected the AI recommendation to round-trip")
    assertEquals("Juanito", reloaded.careRecord.plant.nickname)
    assertEquals("bajo", reloaded.riskLevel)
  }
}

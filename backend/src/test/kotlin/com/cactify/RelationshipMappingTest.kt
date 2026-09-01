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
import java.time.OffsetDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class RelationshipMappingTest : AbstractIntegrationTest() {

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private fun persistPlant(nickname: String, suffix: String): Plant {
    val soilMix = SoilMix(name = "Test mix $suffix", organicPercentage = 40, mineralPercentage = 60, phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"))
    val species = Species(
      scientificName = "Testus $suffix", commonName = "Test plant $suffix",
      minHumidity = 10, maxHumidity = 20, minTemperature = 10, maxTemperature = 20,
      minLightHours = 6, maxLightHours = 10, wateringGuideline = "weekly", soilMix = soilMix,
    )
    val location = Location(name = "Test location $suffix")
    val plant = Plant(nickname = nickname, location = location, species = species)
    entityManager.persist(soilMix)
    entityManager.persist(species)
    entityManager.persist(location)
    entityManager.persist(plant)
    return plant
  }

  private fun persistTag(name: String): Tag = Tag(name = name).also { entityManager.persist(it) }

  private fun tagRowCount(plant: Plant): Int =
    (
      entityManager
        .createNativeQuery("SELECT count(*) FROM plant_tag WHERE plant_id = :plantId")
        .setParameter("plantId", plant.id.toString().toLong())
        .singleResult as Number
      ).toInt()

  @Test
  fun `assigning tags to a plant writes the association rows and round-trips`() {
    val plant = persistPlant("Pepito", "assign")
    val globular = persistTag("test-assign-globular")
    val small = persistTag("test-assign-small")

    plant.updateTags(setOf(globular, small))
    entityManager.flush()

    assertEquals(2, tagRowCount(plant))

    entityManager.clear()
    val reloaded = entityManager.find(Plant::class.java, plant.id)

    assertNotNull(reloaded)
    assertEquals(
      setOf("test-assign-globular", "test-assign-small"),
      reloaded.tags.map { it.name }.toSet(),
    )
  }

  @Test
  fun `replacing the tag set leaves only the new tags`() {
    val plant = persistPlant("Pepito", "replace")
    val globular = persistTag("test-replace-globular")
    val small = persistTag("test-replace-small")
    val hybrid = persistTag("test-replace-hybrid")

    plant.updateTags(setOf(globular, small))
    entityManager.flush()

    plant.updateTags(setOf(hybrid))
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Plant::class.java, plant.id)

    assertNotNull(reloaded)
    assertEquals(listOf("test-replace-hybrid"), reloaded.tags.map { it.name })
  }

  @Test
  fun `assigning an empty set clears every association row`() {
    val plant = persistPlant("Pepito", "clear")
    val globular = persistTag("test-clear-globular")

    plant.updateTags(setOf(globular))
    entityManager.flush()
    assertEquals(1, tagRowCount(plant))

    plant.updateTags(emptySet())
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Plant::class.java, plant.id)

    assertNotNull(reloaded)
    assertTrue(reloaded.tags.isEmpty(), "expected the plant to have no tags left")
    assertEquals(0, tagRowCount(plant))
  }

  @Test
  fun `assigning the same tag set twice is idempotent`() {
    val plant = persistPlant("Pepito", "idempotent")
    val globular = persistTag("test-idempotent-globular")

    plant.updateTags(setOf(globular))
    entityManager.flush()
    plant.updateTags(setOf(globular))
    entityManager.flush()

    assertEquals(1, tagRowCount(plant))
  }

  @Test
  fun `a care record and its AI recommendation round-trip back to their plant`() {
    val plant = persistPlant("Juanito", "care")
    val careRecord = CareRecord(plant = plant, humidity = 40, temperature = 22, lightHours = 8, waterAmountMl = 150, soilPh = BigDecimal("6.2"), recordedAt = OffsetDateTime.now())
    val recommendation = AIRecommendation(careRecord = careRecord, riskLevel = "bajo", recommendationText = "Todo correcto")

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

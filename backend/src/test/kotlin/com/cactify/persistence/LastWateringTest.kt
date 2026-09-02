package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.domain.CareRecord
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.CareRecordRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.Clock
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * El último riego que alimenta el prompt: la lectura más reciente con riego **mayor que cero** y
 * no posterior a la lectura que se analiza.
 */
class LastWateringTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var careRecordRepository: CareRecordRepository

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private lateinit var plant: Plant

  private fun reading(day: Int, waterAmountMl: Int?): CareRecord {
    val record = CareRecord.record(
      plant = plant,
      humidity = 35,
      waterAmountMl = waterAmountMl,
      recordedAt = Instant.parse("2026-08-%02dT10:00:00Z".format(day)),
      clock = Clock.systemUTC(),
      maxFutureSkew = Duration.ofMinutes(5),
    )
    entityManager.persist(record)
    return record
  }

  private fun setUpPlant() {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    val location = entityManager.find(Location::class.java, LocationId.from("300001"))
    plant = Plant(nickname = "Bola con riegos", location = location, species = species)
    entityManager.persist(plant)
  }

  @Test
  fun `the last watering ignores readings with no water and with zero water`() {
    setUpPlant()
    reading(1, 150)
    reading(2, 0)
    reading(3, null)
    entityManager.flush()

    val last = careRecordRepository.findLastWatering(plant.id, Instant.parse("2026-08-10T10:00:00Z"))

    assertEquals(150, last!!.waterAmountMl)
    assertEquals(Instant.parse("2026-08-01T10:00:00Z"), last.recordedAt)
  }

  @Test
  fun `a watering after the analysed reading does not count`() {
    setUpPlant()
    reading(1, 100)
    reading(9, 300)
    entityManager.flush()

    val last = careRecordRepository.findLastWatering(plant.id, Instant.parse("2026-08-05T10:00:00Z"))

    assertEquals(100, last!!.waterAmountMl, "el riego del día 9 es posterior a la lectura analizada")
  }

  @Test
  fun `a plant with no watering at all has none`() {
    setUpPlant()
    reading(1, 0)
    reading(2, null)
    entityManager.flush()

    assertNull(careRecordRepository.findLastWatering(plant.id, Instant.parse("2026-08-10T10:00:00Z")))
  }
}

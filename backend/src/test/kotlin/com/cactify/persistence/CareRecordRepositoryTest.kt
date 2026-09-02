package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.AIRecommendationRepository
import com.cactify.domain.repos.CareRecordRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import java.time.Clock
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort

/** Los dos puertos nuevos, al nivel del repositorio. */
class CareRecordRepositoryTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var careRecordRepository: CareRecordRepository

  @Autowired
  lateinit var aiRecommendationRepository: AIRecommendationRepository

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private fun plant(nickname: String): Plant {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    val location = entityManager.find(Location::class.java, LocationId.from("300001"))
    return Plant(nickname = nickname, location = location, species = species)
      .also { entityManager.persist(it) }
  }

  @Test
  fun `the listing returns only the readings of the plant asked for`() {
    val mine = plant("Con lecturas")
    val other = plant("Sin lecturas mias")
    careRecordRepository.save(CareRecord.record(plant = mine, humidity = 30, recordedAt = Instant.parse("2026-08-01T10:00:00Z"), clock = Clock.systemUTC(), maxFutureSkew = Duration.ofMinutes(5)))
    careRecordRepository.save(CareRecord.record(plant = mine, humidity = 31, recordedAt = Instant.parse("2026-08-02T10:00:00Z"), clock = Clock.systemUTC(), maxFutureSkew = Duration.ofMinutes(5)))
    careRecordRepository.save(CareRecord.record(plant = other, humidity = 32, recordedAt = Instant.parse("2026-08-03T10:00:00Z"), clock = Clock.systemUTC(), maxFutureSkew = Duration.ofMinutes(5)))

    val page = careRecordRepository.findAllByPlantId(mine.id, PageRequest.of(0, 10, Sort.by("recordedAt")))

    assertEquals(2, page.totalElements)
    assertEquals(setOf(30, 31), page.content.map { it.humidity }.toSet())
  }

  @Test
  fun `recommendations are fetched for the ids asked for and no others`() {
    val p = plant("Con recomendaciones")
    val withRecommendation = careRecordRepository.save(
      CareRecord.record(plant = p, humidity = 5, recordedAt = Instant.parse("2026-08-01T10:00:00Z"), clock = Clock.systemUTC(), maxFutureSkew = Duration.ofMinutes(5)),
    )
    val without = careRecordRepository.save(
      CareRecord.record(plant = p, humidity = 40, recordedAt = Instant.parse("2026-08-02T10:00:00Z"), clock = Clock.systemUTC(), maxFutureSkew = Duration.ofMinutes(5)),
    )
    entityManager.persist(
      AIRecommendation(
        careRecord = withRecommendation,
        riskLevel = RiskLevel.High,
        recommendationText = "Riega",
        recommendedAction = "Riega hasta drenaje",
        priority = Priority.Immediate,
      ),
    )
    entityManager.flush()

    val found = aiRecommendationRepository.findAllByCareRecordIdIn(listOf(withRecommendation.id, without.id))

    assertEquals(1, found.size)
    assertEquals(withRecommendation.id, found.single().careRecord.id)
  }
}

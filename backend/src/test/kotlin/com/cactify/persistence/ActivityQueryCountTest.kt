package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.ActivityService
import com.cactify.domain.Batch
import com.cactify.domain.BatchAction
import com.cactify.domain.BatchScopeKind
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantComment
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * La actividad trae la página de referencias y **una consulta por tipo**, no una por entrada. Con
 * lotes y comentarios mezclados el número de sentencias no depende de cuántas entradas haya.
 */
@Transactional
class ActivityQueryCountTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var activityService: ActivityService

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `the number of statements does not grow with the number of entries in the page`() {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    val location = entityManager.find(Location::class.java, LocationId.from("300001"))
    val plant = Plant(code = "TEST-AQ-01", nickname = "Bola de actividad", location = location, species = species)
    entityManager.persist(plant)
    val clock = Clock.systemUTC()
    val skew = Duration.ofMinutes(5)
    repeat(10) { i ->
      entityManager.persist(Batch.record(BatchAction.Comment, BatchScopeKind.Location, 5 + i, null, clock, skew))
      entityManager.persist(PlantComment.record(plant, "Nota $i", null, clock, skew, null))
    }
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    entityManager.flush()
    entityManager.clear()
    statistics.clear()

    val page = activityService.recent(PageRequest.of(0, 20))

    assertEquals(20, page.content.size)
    assertTrue(page.content.all { it.batch != null || it.comment != null })
    // count + página + una por tipo presente = 4; con una consulta por entrada serían más de 20.
    assertTrue(
      statistics.prepareStatementCount <= 6,
      "el número de consultas crece con las entradas: fueron ${statistics.prepareStatementCount} para ${page.content.size}",
    )
  }
}

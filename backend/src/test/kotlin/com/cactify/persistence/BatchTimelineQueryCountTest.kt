package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.PlantTimelineService
import com.cactify.domain.Batch
import com.cactify.domain.BatchAction
import com.cactify.domain.BatchScopeKind
import com.cactify.domain.CareRecord
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
import java.time.Clock
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * `batchSize` sale de la fila del lote: la cronología la trae **por página**, no una consulta por
 * entrada. Si alguien mapease el lote con una carga que no se agrupa, este test lo cazaría.
 */
class BatchTimelineQueryCountTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var timelineService: PlantTimelineService

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `the number of queries does not grow with the number of batches in the page`() {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    val location = entityManager.find(Location::class.java, LocationId.from("300001"))
    val plant = Plant(code = "TEST-BQ-01", nickname = "Bola de lotes", location = location, species = species)
    entityManager.persist(plant)
    val clock = Clock.systemUTC()
    val skew = Duration.ofMinutes(5)
    repeat(10) { i ->
      val batch = Batch.record(BatchAction.Comment, BatchScopeKind.Location, 5 + i, null, clock, skew)
      entityManager.persist(batch)
      entityManager.persist(PlantComment.record(plant, "Nota $i", null, clock, skew, batch))
      entityManager.persist(CareRecord.record(plant = plant, waterAmountMl = 100 + i, recordedAt = null, clock = clock, maxFutureSkew = skew, batch = batch))
    }
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    entityManager.flush()
    entityManager.clear()
    statistics.clear()

    val page = timelineService.timeline(plant.id.toString(), emptySet(), PageRequest.of(0, 20))

    assertEquals(20, page.content.size)
    assertTrue(page.content.all { it.batchId != null && it.batchSize != null }, "todas las entradas dicen su lote y su tamaño")
    // Con una consulta por lote serían 10 más. Aquí el coste no depende del número de lotes.
    assertTrue(
      statistics.prepareStatementCount < 12,
      "el número de consultas crece con los lotes: fueron ${statistics.prepareStatementCount} para ${page.content.size} entradas",
    )
  }
}

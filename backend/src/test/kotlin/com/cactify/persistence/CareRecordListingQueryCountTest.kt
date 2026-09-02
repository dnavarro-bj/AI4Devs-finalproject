package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.CareRecordService
import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import java.time.Clock
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort

/**
 * El listado resuelve la recomendación de cada lectura **por página**, no por fila. Si alguien
 * mapeara un `@OneToOne(mappedBy = ...)` en `CareRecord`, este test lo cazaría: el lado inverso de
 * un `@OneToOne` no puede ser realmente `LAZY` y dispararía un `SELECT` por lectura.
 */
class CareRecordListingQueryCountTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var careRecordService: CareRecordService

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `the number of queries does not grow with the page size`() {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    val location = entityManager.find(Location::class.java, LocationId.from("300001"))
    val plant = Plant(nickname = "Bola con muchas lecturas", location = location, species = species)
    entityManager.persist(plant)
    repeat(12) { i ->
      val record = CareRecord.record(
        plant = plant,
        humidity = i,
        recordedAt = Instant.parse("2026-08-01T10:00:00Z").plusSeconds(i.toLong()),
        clock = Clock.systemUTC(),
        maxFutureSkew = Duration.ofMinutes(5),
      )
      entityManager.persist(record)
      // La mitad con recomendación, para que el mapa no se resuelva trivialmente vacío.
      if (i % 2 == 0) {
        entityManager.persist(
          AIRecommendation(
            careRecord = record,
            riskLevel = RiskLevel.Low,
            recommendationText = "Todo correcto",
            recommendedAction = "No hagas nada",
            priority = Priority.Routine,
          ),
        )
      }
    }

    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    entityManager.flush()
    entityManager.clear()
    statistics.clear()

    val page = careRecordService.list(
      plant.id.toString(),
      PageRequest.of(0, 12, Sort.by(Sort.Direction.DESC, "recordedAt", "id.id")),
    )

    assertEquals(12, page.content.size)
    // Con un N+1 serían 12 consultas de recomendación. Aquí el coste no depende del tamaño.
    assertTrue(
      statistics.prepareStatementCount < page.content.size,
      "el número de consultas crece con la página: fueron ${statistics.prepareStatementCount} " +
        "para ${page.content.size} lecturas",
    )
  }
}

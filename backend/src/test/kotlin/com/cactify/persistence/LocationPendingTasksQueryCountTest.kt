package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.LocationService
import com.cactify.domain.Location
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.transaction.annotation.Transactional
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * `pendingTasks` se calcula con **una** consulta agregada para toda la página, como los recuentos de
 * plantas y de alertas. Si alguien lo resolviese localización a localización, el número de sentencias
 * crecería con las filas y este test lo cazaría.
 */
@Transactional
class LocationPendingTasksQueryCountTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var locationService: LocationService

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private fun statementsFor(size: Int): Long {
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    entityManager.flush()
    entityManager.clear()
    statistics.clear()
    val page = locationService.list(PageRequest.of(0, size))
    assertTrue(page.content.size >= minOf(size, 3))
    return statistics.prepareStatementCount
  }

  @Test
  fun `the number of statements does not grow with the number of locations in the page`() {
    repeat(40) { index ->
      entityManager.persist(Location(name = "Zona de prueba $index", code = "LOC-QC-%03d".format(index)))
    }
    entityManager.flush()

    val few = statementsFor(3)
    val many = statementsFor(40)

    assertEquals(few, many, "las sentencias crecen con las filas: $few con 3 y $many con 40")
  }
}

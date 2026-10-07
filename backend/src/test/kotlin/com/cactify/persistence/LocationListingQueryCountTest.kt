package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.LocationService
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import kotlin.test.assertEquals

/**
 * La ruta y los recuentos del listado se piden **por página**, no por fila: el número de sentencias
 * no puede crecer con las filas. Si alguien resolviera la ruta o el total fila a fila, este test lo
 * cazaría. El árbol es una cadena profunda para que la recursión tenga trabajo que hacer.
 */
class LocationListingQueryCountTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var locationService: LocationService

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `the number of statements does not depend on the rows of the page`() {
    var parent: LocationId? = null
    repeat(15) { i ->
      val location = Location(name = "Nivel $i", code = "LOC-QC-$i", parentId = parent)
      entityManager.persist(location)
      parent = location.id
    }
    entityManager.flush()
    entityManager.clear()

    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true

    fun statementsFor(size: Int): Long {
      entityManager.clear()
      statistics.clear()
      val page = locationService.list(PageRequest.of(0, size, Sort.by("name")))
      assertEquals(size, page.content.size)
      return statistics.prepareStatementCount
    }

    val small = statementsFor(3)
    val large = statementsFor(15)

    assertEquals(small, large, "el número de sentencias crece con la página: $small para 3 filas y $large para 15")
  }
}

package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.SavedViewRequest
import com.cactify.application.SavedViewService
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import kotlin.test.assertEquals

/**
 * El listado de grupos hace **una consulta de recuento por grupo**, no una por especie: añadir
 * especies no cambia el número de sentencias, y cada grupo añade exactamente una.
 */
class SavedViewQueryCountTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var savedViewService: SavedViewService

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private fun statementsToList(groups: Int): Long {
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    entityManager.clear()
    statistics.clear()
    val page = savedViewService.list("species", PageRequest.of(0, 50))
    assertEquals(groups, page.content.size)
    return statistics.prepareStatementCount
  }

  private fun group(i: Int) {
    savedViewService.create(SavedViewRequest(scope = "species", name = "Grupo $i", query = "minTemperatureFrom=${i % 15}"))
  }

  @Test
  fun `every group adds one count and no species is read one by one`() {
    group(1)
    group(2)
    entityManager.flush()
    val two = statementsToList(2)

    (3..10).forEach { group(it) }
    entityManager.flush()
    val ten = statementsToList(10)

    assertEquals(two + 8, ten, "se esperaba una sentencia más por grupo: $two con 2 grupos y $ten con 10")
  }

  @Test
  fun `more species do not add statements`() {
    group(1)
    entityManager.flush()
    val before = statementsToList(1)

    repeat(30) { i ->
      entityManager.createNativeQuery(
        """INSERT INTO species (id, code, scientific_name, common_name, min_humidity, max_humidity, min_temperature,
             max_temperature, min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
           VALUES (${960_000 + i}, 'CAT-QC$i', 'Especie qc $i', 'Común qc $i', 10, 30, 10, 35, 6, 10, 'riego', 100001)""",
      ).executeUpdate()
    }
    val after = statementsToList(1)

    assertEquals(before, after)
  }
}

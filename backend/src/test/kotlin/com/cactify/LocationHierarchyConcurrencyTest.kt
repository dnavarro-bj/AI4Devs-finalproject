package com.cactify

import com.cactify.application.LocationHierarchyCycleException
import com.cactify.application.LocationService
import com.cactify.application.LocationService.LocationInput
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Dos ediciones que por separado son válidas —A bajo B y B bajo A— no pueden formar un ciclo entre
 * las dos. La primera retiene su transacción abierta mientras la segunda arranca: sin el bloqueo de la
 * jerarquía, la segunda no vería el cambio sin confirmar de la primera y las dos tendrían éxito.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class LocationHierarchyConcurrencyTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var locationService: LocationService

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  @Autowired
  lateinit var jdbc: JdbcTemplate

  @Test
  fun `two concurrent edits cannot form a cycle between them`() {
    val a = locationService.create(LocationInput(name = "Ciclo A", code = "LOC-CICLO-A")).id
    val b = locationService.create(LocationInput(name = "Ciclo B", code = "LOC-CICLO-B")).id
    val pool = Executors.newFixedThreadPool(2)
    try {
      val firstEditing = CountDownLatch(1)
      val secondStarted = CountDownLatch(1)

      val first = pool.submit<Throwable?> {
        runCatching {
          TransactionTemplate(transactionManager).execute {
            locationService.update(a, LocationInput(name = "Ciclo A", code = "LOC-CICLO-A", parentId = b))
            firstEditing.countDown()
            // Retiene la transacción hasta que la otra edición haya arrancado (y esté esperando el bloqueo).
            secondStarted.await(5, TimeUnit.SECONDS)
            Thread.sleep(500)
          }
        }.exceptionOrNull()
      }
      val second = pool.submit<Throwable?> {
        firstEditing.await(5, TimeUnit.SECONDS)
        secondStarted.countDown()
        runCatching { locationService.update(b, LocationInput(name = "Ciclo B", code = "LOC-CICLO-B", parentId = a)) }.exceptionOrNull()
      }

      val failures = listOfNotNull(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS))

      assertEquals(1, failures.size, "exactamente una de las dos debía rechazarse: $failures")
      assertTrue(failures.single() is LocationHierarchyCycleException, "debía ser el ciclo, y fue ${failures.single()}")
      val parents = jdbc.queryForList("SELECT parent_id FROM location WHERE id IN (?, ?)", a.toLong(), b.toLong())
      assertEquals(1, parents.count { it["parent_id"] != null }, "solo una de las dos queda colgando de la otra")
    } finally {
      pool.shutdownNow()
      jdbc.update("UPDATE location SET parent_id = NULL WHERE id IN (?, ?)", a.toLong(), b.toLong())
      jdbc.update("DELETE FROM location WHERE id IN (?, ?)", a.toLong(), b.toLong())
    }
  }
}

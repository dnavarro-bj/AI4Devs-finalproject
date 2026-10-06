package com.cactify.api

import com.cactify.AbstractIntegrationTest
import com.cactify.application.PlantService
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals

/**
 * Escenario «Altas simultáneas de la misma especie».
 *
 * **No hereda la transacción de los tests.** Los demás tests corren dentro de una transacción que
 * se revierte; aquí las altas necesitan transacciones **reales y separadas**, o el bloqueo de fila
 * no se ejercita. Por eso crea sus datos confirmados y los **borra al terminar**, con una especie
 * propia de código inconfundible por si una interrupción deja restos.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PlantCodeConcurrencyTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var plantService: PlantService

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private val speciesId = 970001L
  private val speciesCode = "TEST-CONCURRENCY"

  @BeforeEach
  fun createSpecies() {
    cleanup()
    jdbc.update(
      """
      INSERT INTO species (id, code, next_sequence, scientific_name, common_name, min_humidity, max_humidity,
        min_temperature, max_temperature, min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
      VALUES (?, ?, 1, 'Concurrentia testis', 'Prueba', 10, 30, 10, 35, 6, 10, 'cada 10 dias', 100001)
      """.trimIndent(),
      speciesId, speciesCode,
    )
  }

  @AfterEach
  fun cleanup() {
    jdbc.update("DELETE FROM plant WHERE species_id = ?", speciesId)
    jdbc.update("DELETE FROM species WHERE id = ?", speciesId)
  }

  @Test
  fun `simultaneous creations of the same species get distinct consecutive codes`() {
    val threads = 6
    val start = CountDownLatch(1)
    val pool = Executors.newFixedThreadPool(threads)

    val futures = (1..threads).map { n ->
      pool.submit<String> {
        start.await()
        plantService.create("Bola $n", "300001", speciesId.toString()).code
      }
    }
    start.countDown()
    val codes = futures.map { it.get(30, TimeUnit.SECONDS) }
    pool.shutdown()

    assertEquals(threads, codes.toSet().size, "ningún código repetido: $codes")
    assertEquals(
      (1..threads).map { "$speciesCode-${it.toString().padStart(2, '0')}" }.toSet(),
      codes.toSet(),
      "los números deben ser consecutivos y sin huecos",
    )
  }
}

package com.cactify.alerts

import com.cactify.AbstractIntegrationTest
import com.cactify.application.CareRecordService
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
 * Escenario «Detecciones simultáneas». **No hereda la transacción de los tests**: el bloqueo de la
 * condición y el índice único solo se ejercitan con transacciones reales y separadas, así que crea
 * sus datos confirmados y los borra al terminar.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AlertConcurrencyTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var careRecords: CareRecordService

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private val plantId = 995_001L

  @BeforeEach
  fun createPlant() {
    cleanup()
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, 'TEST-CONC-AL-01', 'Concurrente', 200001, 300001)",
      plantId,
    )
  }

  @AfterEach
  fun cleanup() {
    jdbc.update("DELETE FROM alert_transition WHERE alert_id IN (SELECT id FROM alert WHERE plant_id = ?)", plantId)
    jdbc.update("DELETE FROM alert WHERE plant_id = ?", plantId)
    jdbc.update("DELETE FROM care_record WHERE plant_id = ?", plantId)
    jdbc.update("DELETE FROM plant WHERE id = ?", plantId)
  }

  @Test
  fun `simultaneous readings out of range leave a single open alert with all the occurrences`() {
    val threads = 6
    val start = CountDownLatch(1)
    val pool = Executors.newFixedThreadPool(threads)

    val futures = (1..threads).map {
      pool.submit {
        start.await()
        careRecords.create(plantId.toString(), CareRecordService.NewCareRecord(null, 2, null, null, null, null))
      }
    }
    start.countDown()
    futures.forEach { it.get(30, TimeUnit.SECONDS) }
    pool.shutdown()

    val rows = jdbc.queryForList("SELECT occurrences, status FROM alert WHERE plant_id = ?", plantId)
    assertEquals(1, rows.size, "una sola alerta abierta")
    assertEquals(threads, rows.single()["occurrences"])
    assertEquals(
      1L,
      jdbc.queryForObject("SELECT count(*) FROM alert_transition WHERE alert_id IN (SELECT id FROM alert WHERE plant_id = ?)", Long::class.java, plantId),
      "una sola apertura",
    )
  }
}

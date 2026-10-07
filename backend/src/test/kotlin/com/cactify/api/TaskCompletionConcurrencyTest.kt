package com.cactify.api

import com.cactify.AbstractIntegrationTest
import com.cactify.application.CompleteTaskRequest
import com.cactify.application.TaskService
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
 * Escenarios «Dos finalizaciones a la vez» y «Atomicidad».
 *
 * **No hereda la transacción de los tests**: las dos finalizaciones necesitan transacciones reales y
 * separadas, o el bloqueo de la fila de la tarea no se ejercita; y la atomicidad solo se comprueba si
 * lo escrito antes del fallo se **confirma** o se **revierte** de verdad. Por eso crea sus datos
 * confirmados y los borra al terminar.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class TaskCompletionConcurrencyTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var taskService: TaskService

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private val locationId = 970_101L
  private val taskId = 970_201L
  private val plants = (1..3).map { 970_300L + it }

  @BeforeEach
  fun create() {
    cleanup()
    jdbc.update("INSERT INTO location (id, name, code) VALUES (?, 'Concurrencia', 'LOC-TEST-TASK-CONC')", locationId)
    plants.forEachIndexed { index, id ->
      jdbc.update(
        "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, ?, 'Planta', 200001, ?)",
        id, "TEST-CONC-0${index + 1}", locationId,
      )
    }
    jdbc.update(
      """
      INSERT INTO task (id, task_type, title, due_from, due_to, location_id)
      VALUES (?, 'riego', 'Regar', '2026-10-15', '2026-10-15', ?)
      """.trimIndent(),
      taskId, locationId,
    )
  }

  @AfterEach
  fun cleanup() {
    jdbc.update("DROP TRIGGER IF EXISTS test_fail_task_event ON plant_event")
    jdbc.update("DROP FUNCTION IF EXISTS test_fail_task_event()")
    jdbc.update("DELETE FROM plant_event WHERE plant_id BETWEEN 970301 AND 970399")
    jdbc.update("DELETE FROM task WHERE id = ?", taskId)
    jdbc.update("DELETE FROM plant WHERE id BETWEEN 970301 AND 970399")
    jdbc.update("DELETE FROM location WHERE id = ?", locationId)
  }

  private fun events() = jdbc.queryForObject(
    "SELECT count(*) FROM plant_event WHERE event_type = 'tarea' AND plant_id BETWEEN 970301 AND 970399", Int::class.java,
  )

  @Test
  fun `two simultaneous completions leave one and one event per plant`() {
    val threads = 2
    val start = CountDownLatch(1)
    val pool = Executors.newFixedThreadPool(threads)

    val futures = (1..threads).map {
      pool.submit<Boolean> {
        start.await()
        runCatching { taskService.complete(taskId.toString(), CompleteTaskRequest()) }.isSuccess
      }
    }
    start.countDown()
    val results = futures.map { it.get(30, TimeUnit.SECONDS) }
    pool.shutdown()

    assertEquals(1, results.count { it }, "una completa y la otra falla: $results")
    assertEquals(plants.size, events(), "cada planta tiene un solo evento")
    assertEquals("completada", jdbc.queryForObject("SELECT status FROM task WHERE id = ?", String::class.java, taskId))
  }

  @Test
  fun `a failure writing one plant leaves neither the task completed nor a loose event`() {
    // El fallo de verdad: la base rechaza el evento de la tercera planta, ya escritas las dos primeras.
    jdbc.update(
      """
      CREATE FUNCTION test_fail_task_event() RETURNS trigger AS ${'$'}${'$'}
      BEGIN
        IF NEW.event_type = 'tarea' AND NEW.plant_id = ${plants.last()} THEN
          RAISE EXCEPTION 'fallo de prueba';
        END IF;
        RETURN NEW;
      END;
      ${'$'}${'$'} LANGUAGE plpgsql
      """.trimIndent(),
    )
    jdbc.update("CREATE TRIGGER test_fail_task_event BEFORE INSERT ON plant_event FOR EACH ROW EXECUTE FUNCTION test_fail_task_event()")

    runCatching { taskService.complete(taskId.toString(), CompleteTaskRequest()) }

    assertEquals(0, events(), "ninguna planta conserva su evento")
    assertEquals("pendiente", jdbc.queryForObject("SELECT status FROM task WHERE id = ?", String::class.java, taskId))
  }
}

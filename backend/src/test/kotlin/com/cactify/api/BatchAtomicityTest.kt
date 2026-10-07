package com.cactify.api

import com.cactify.AbstractIntegrationTest
import com.cactify.application.BatchRequest
import com.cactify.application.BatchScopeRequest
import com.cactify.application.BatchService
import com.cactify.application.CommentInput
import com.cactify.application.ReadingInput
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import kotlin.test.assertEquals

/**
 * Escenarios «Todo o nada» y «Una gran operación».
 *
 * **No hereda la transacción de los tests**: la atomicidad solo se comprueba si lo escrito antes del
 * fallo se **confirma** o se **revierte** de verdad. Por eso crea sus datos confirmados y los borra
 * al terminar.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class BatchAtomicityTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var batchService: BatchService

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private val locationId = 971_101L

  @BeforeEach
  fun create() {
    cleanup()
    jdbc.update("INSERT INTO location (id, name, code) VALUES (?, 'Lote', 'LOC-TEST-BATCH')", locationId)
  }

  @AfterEach
  fun cleanup() {
    jdbc.update("DROP TRIGGER IF EXISTS test_fail_batch_event ON plant_event")
    jdbc.update("DROP FUNCTION IF EXISTS test_fail_batch_event()")
    jdbc.update("DELETE FROM care_record WHERE plant_id IN (SELECT id FROM plant WHERE location_id = ?)", locationId)
    jdbc.update("DELETE FROM plant_event WHERE plant_id IN (SELECT id FROM plant WHERE location_id = ?)", locationId)
    jdbc.update("DELETE FROM batch")
    jdbc.update("DELETE FROM plant WHERE location_id = ?", locationId)
    jdbc.update("DELETE FROM location WHERE id = ?", locationId)
  }

  private fun plants(count: Int) {
    jdbc.update(
      """
      INSERT INTO plant (id, code, nickname, species_id, location_id)
      SELECT 971200 + g, 'TEST-BATCH-' || lpad(g::text, 5, '0'), 'Planta', 200001, ? FROM generate_series(1, ?) g
      """.trimIndent(),
      locationId, count,
    )
  }

  private fun scope() = BatchScopeRequest(kind = "location", locationId = locationId.toString())

  private fun count(sql: String) = jdbc.queryForObject(sql, Int::class.java)!!

  @Test
  fun `a failure writing one plant leaves no record and no batch row`() {
    plants(3)
    // El fallo de verdad: la base rechaza el comentario de la tercera planta, ya escritas las dos primeras.
    jdbc.update(
      """
      CREATE FUNCTION test_fail_batch_event() RETURNS trigger AS ${'$'}${'$'}
      BEGIN
        IF NEW.event_type = 'comentario' AND NEW.plant_id = 971203 THEN
          RAISE EXCEPTION 'fallo de prueba';
        END IF;
        RETURN NEW;
      END;
      ${'$'}${'$'} LANGUAGE plpgsql
      """.trimIndent(),
    )
    jdbc.update("CREATE TRIGGER test_fail_batch_event BEFORE INSERT ON plant_event FOR EACH ROW EXECUTE FUNCTION test_fail_batch_event()")

    runCatching { batchService.apply(BatchRequest(scope = scope(), comment = CommentInput("Nota"))) }

    assertEquals(0, count("SELECT count(*) FROM plant_event WHERE plant_id BETWEEN 971201 AND 971299"))
    assertEquals(0, count("SELECT count(*) FROM batch"))
  }

  @Test
  fun `a big batch is a single transaction with one record per plant`() {
    plants(1_500)

    val response = batchService.apply(BatchRequest(scope = scope(), reading = ReadingInput(waterAmountMl = 200)))

    assertEquals(1_500, response.plantCount)
    assertEquals(1, count("SELECT count(*) FROM batch"))
    assertEquals(1_500, count("SELECT count(*) FROM care_record WHERE batch_id = ${response.id}"))
    assertEquals(1_500, count("SELECT count(DISTINCT plant_id) FROM care_record WHERE batch_id = ${response.id}"))
  }

  @Test
  fun `the number of plants is the real one`() {
    plants(10)

    val response = batchService.apply(
      BatchRequest(scope = scope(), comment = CommentInput("Nota"), excludedPlantIds = listOf("971201", "971202", "971203")),
    )

    assertEquals(7, response.plantCount)
    assertEquals(7, count("SELECT plant_count FROM batch WHERE id = ${response.id}"))
    assertEquals(7, count("SELECT count(*) FROM plant_event WHERE batch_id = ${response.id}"))
  }
}

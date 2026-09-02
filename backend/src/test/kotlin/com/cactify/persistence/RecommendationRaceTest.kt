package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.FakeCareAdvisor
import com.cactify.FakeCareAdvisorConfiguration
import com.cactify.application.RecommendationService
import com.cactify.domain.CareRecordId
import com.cactify.domain.PlantId
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Instant
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals

/**
 * Escenario "Solicitudes simultáneas". Corre **sin** la transacción de test que revierte
 * (`NOT_SUPPORTED`), porque una carrera solo existe si los dos hilos confirman de verdad; por eso
 * limpia lo que crea al terminar.
 */
@Import(FakeCareAdvisorConfiguration::class)
class RecommendationRaceTest : AbstractIntegrationTest() {

  @Autowired lateinit var recommendationService: RecommendationService
  @Autowired lateinit var advisor: FakeCareAdvisor
  @Autowired lateinit var jdbcTemplate: JdbcTemplate

  @Test
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  fun `two simultaneous requests leave a single recommendation`() {
    advisor.reset()
    val plantId = PlantId.create()
    val recordId = CareRecordId.create()
    jdbcTemplate.update(
      "INSERT INTO plant (id, nickname, location_id, species_id) VALUES (?, 'Bola en carrera', 300001, 200001)",
      plantId.id,
    )
    jdbcTemplate.update(
      "INSERT INTO care_record (id, plant_id, humidity, recorded_at) VALUES (?, ?, 20, ?)",
      recordId.id, plantId.id, Timestamp.from(Instant.parse("2026-08-01T10:00:00Z")),
    )

    // Los dos hilos se esperan dentro del proveedor: así ambos han pasado la comprobación de
    // "¿ya existe?" antes de que ninguno persista, que es la carrera que se quiere provocar.
    val barrier = CyclicBarrier(2)
    advisor.onAdvise = { barrier.await(10, TimeUnit.SECONDS) }

    val pool = Executors.newFixedThreadPool(2)
    try {
      val call = Callable { recommendationService.generate(plantId.toString(), recordId.toString()) }
      val results = pool.invokeAll(listOf(call, call)).map { it.get(20, TimeUnit.SECONDS) }

      assertEquals(2, advisor.callCount, "ambos hilos llegaron a consultar al proveedor")
      assertEquals(
        1,
        results.map { it.recommendation.id }.toSet().size,
        "ambas peticiones deben devolver la misma recomendación",
      )
      assertEquals(
        1,
        jdbcTemplate.queryForObject(
          "SELECT count(*) FROM ai_recommendation WHERE care_record_id = ?", Int::class.java, recordId.id,
        ),
        "la lectura debe quedar con una sola recomendación",
      )
    } finally {
      pool.shutdownNow()
      advisor.reset()
      jdbcTemplate.update("DELETE FROM ai_recommendation WHERE care_record_id = ?", recordId.id)
      jdbcTemplate.update("DELETE FROM care_record WHERE id = ?", recordId.id)
      jdbcTemplate.update("DELETE FROM plant WHERE id = ?", plantId.id)
    }
  }
}

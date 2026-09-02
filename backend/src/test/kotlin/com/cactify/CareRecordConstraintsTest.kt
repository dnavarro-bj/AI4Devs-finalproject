package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertFailsWith

/**
 * Escenarios de "Restricciones de dominio de las lecturas de cultivo": la red de seguridad en base
 * de datos (ADR-002), independiente de la validación del cuerpo de la petición.
 *
 * Ojo con el orden de las sentencias: un `CHECK` violado aborta la transacción de PostgreSQL, así
 * que el `assertFailsWith` tiene que ser lo último de cada test.
 */
class CareRecordConstraintsTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  private fun insertPlant(): Long {
    val id = System.nanoTime()
    jdbcTemplate.update(
      "INSERT INTO plant (id, nickname, location_id, species_id) VALUES (?, 'Bola de restricciones', 300001, 200001)",
      id,
    )
    return id
  }

  @Test
  fun `a reading with humidity out of range is rejected`() {
    val plantId = insertPlant()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO care_record (id, plant_id, humidity, recorded_at) VALUES (?, ?, 150, now())",
        System.nanoTime(), plantId,
      )
    }
  }

  @Test
  fun `a reading with soil pH out of range is rejected`() {
    val plantId = insertPlant()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO care_record (id, plant_id, soil_ph, recorded_at) VALUES (?, ?, 15.0, now())",
        System.nanoTime(), plantId,
      )
    }
  }

  @Test
  fun `a reading with a negative water amount is rejected`() {
    val plantId = insertPlant()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO care_record (id, plant_id, water_amount_ml, recorded_at) VALUES (?, ?, -10, now())",
        System.nanoTime(), plantId,
      )
    }
  }

  @Test
  fun `a reading with light hours beyond the day is rejected`() {
    val plantId = insertPlant()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO care_record (id, plant_id, light_hours, recorded_at) VALUES (?, ?, 25, now())",
        System.nanoTime(), plantId,
      )
    }
  }

  @Test
  fun `a reading with every measurement empty is accepted`() {
    val plantId = insertPlant()

    // Los CHECK acotan el valor cuando lo hay; no obligan a informar ninguno.
    jdbcTemplate.update(
      "INSERT INTO care_record (id, plant_id, recorded_at) VALUES (?, ?, now())",
      System.nanoTime(), plantId,
    )
  }
}

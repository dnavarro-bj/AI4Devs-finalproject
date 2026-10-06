package com.cactify

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** «Los ejemplares existentes siguen heredando»: la migración se aplica sobre una base con ejemplares. */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PlantCareBackfillTest : AbstractIntegrationTest() {

  private val database = "care_${System.nanoTime()}"
  private lateinit var jdbc: JdbcTemplate

  private fun dataSource() = DriverManagerDataSource(
    postgres.jdbcUrl.replaceAfterLast('/', database), postgres.username, postgres.password,
  )

  private fun migrateTo(version: String) {
    Flyway.configure().dataSource(dataSource()).locations("classpath:db/migration").target(version).load().migrate()
  }

  @BeforeEach
  fun createDatabase() {
    JdbcTemplate(DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password))
      .execute("CREATE DATABASE $database")
    jdbc = JdbcTemplate(dataSource())
  }

  @AfterEach
  fun dropDatabase() {
    JdbcTemplate(DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password))
      .execute("DROP DATABASE IF EXISTS $database WITH (FORCE)")
  }

  @Test
  fun `existing plants end up with no own care value`() {
    migrateTo("8")
    jdbc.update("INSERT INTO plant (id, code, nickname, location_id, species_id) VALUES (981001, 'CAT-GRUSS-01', 'Vieja', 300001, 200001)")

    migrateTo("9")

    val row = jdbc.queryForMap("SELECT * FROM plant WHERE id = 981001")
    assertEquals("Vieja", row["nickname"])
    for (column in listOf(
      "care_min_humidity", "care_max_humidity", "care_min_temperature", "care_max_temperature",
      "care_min_light_hours", "care_max_light_hours", "care_watering_guideline", "care_soil_mix_id",
    )) assertNull(row[column], "$column debía ser nulo")
  }
}

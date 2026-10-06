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

/**
 * «Los ejemplares existentes quedan activos»: la migración se aplica sobre una base que **ya tiene**
 * ejemplares, no sobre una vacía. Usa su propia base de datos: migra hasta `V7`, inserta, aplica `V8`.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PlantProfileBackfillTest : AbstractIntegrationTest() {

  private val database = "profile_${System.nanoTime()}"
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
  fun `existing plants end up active with no germination, acquisition or origin invented`() {
    migrateTo("7")
    jdbc.update("INSERT INTO plant (id, code, nickname, location_id, species_id) VALUES (981001, 'CAT-GRUSS-01', 'Vieja', 300001, 200001)")
    jdbc.update("INSERT INTO plant (id, code, nickname, location_id, species_id) VALUES (981002, 'CAT-GRUSS-02', 'Otra', 300001, 200001)")

    migrateTo("8")

    val rows = jdbc.queryForList("SELECT * FROM plant WHERE id IN (981001, 981002)")
    assertEquals(2, rows.size)
    for (row in rows) {
      assertEquals("activa", row["status"])
      assertNull(row["description"])
      assertNull(row["germination_year"])
      assertNull(row["germination_month"])
      assertNull(row["acquired_on"])
      assertNull(row["origin"])
      assertNull(row["origin_note"])
    }
    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM plant_status_change", Int::class.java))
  }
}

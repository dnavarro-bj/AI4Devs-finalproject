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

/**
 * «Las localizaciones existentes pasan a ser raíces con código»: la migración se aplica sobre una
 * base que **ya tiene** localizaciones y plantas, no sobre una vacía. Usa su propia base de datos
 * dentro del mismo contenedor: migra hasta `V11`, inserta, y solo entonces aplica `V12`.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class LocationHierarchyBackfillTest : AbstractIntegrationTest() {

  private val database = "backfill_loc_${System.nanoTime()}"
  private lateinit var jdbc: JdbcTemplate

  @BeforeEach
  fun createDatabase() {
    val admin = DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password)
    JdbcTemplate(admin).execute("CREATE DATABASE $database")
    jdbc = JdbcTemplate(DriverManagerDataSource(postgres.jdbcUrl.replaceAfterLast('/', database), postgres.username, postgres.password))
  }

  @AfterEach
  fun dropDatabase() {
    val admin = DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password)
    JdbcTemplate(admin).execute("DROP DATABASE IF EXISTS $database WITH (FORCE)")
  }

  private fun migrateTo(version: String) {
    val dataSource = DriverManagerDataSource(
      postgres.jdbcUrl.replaceAfterLast('/', database), postgres.username, postgres.password,
    )
    Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(version).load().migrate()
  }

  private fun location(id: Long, name: String) = jdbc.update("INSERT INTO location (id, name) VALUES (?, ?)", id, name)

  @Test
  fun `existing locations become roots with a code derived from their name`() {
    migrateTo("11")
    location(970001, "Vivero Norte")
    location(970002, "Cámara fría")

    migrateTo("12")

    assertEquals("LOC-VN", jdbc.queryForObject("SELECT code FROM location WHERE id = 970001", String::class.java))
    assertEquals("LOC-CF", jdbc.queryForObject("SELECT code FROM location WHERE id = 970002", String::class.java), "sin acentos")
    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM location WHERE parent_id IS NOT NULL", Int::class.java))
  }

  @Test
  fun `names that give the same code are told apart with a numeric suffix`() {
    migrateTo("11")
    location(970001, "Zona Alta")
    location(970002, "Zanja Amplia")
    location(970003, "Zaguan Auxiliar")

    migrateTo("12")

    val codes = jdbc.queryForList("SELECT code FROM location WHERE id >= 970001", String::class.java)
    assertEquals(3, codes.toSet().size, "ningún código repetido: $codes")
    assertEquals("LOC-ZA", jdbc.queryForObject("SELECT code FROM location WHERE id = 970001", String::class.java))
    assertEquals("LOC-ZA-2", jdbc.queryForObject("SELECT code FROM location WHERE id = 970002", String::class.java))
    assertEquals("LOC-ZA-3", jdbc.queryForObject("SELECT code FROM location WHERE id = 970003", String::class.java))
  }

  @Test
  fun `plants keep their location and get no movements`() {
    migrateTo("11")
    location(970001, "Vivero Norte")
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, location_id, species_id) VALUES (971001, 'CAT-GRUSS-01', 'P', 970001, 200001)",
    )

    migrateTo("12")

    assertEquals(970001L, jdbc.queryForObject("SELECT location_id FROM plant WHERE id = 971001", Long::class.java))
    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM plant_movement", Int::class.java))
  }
}

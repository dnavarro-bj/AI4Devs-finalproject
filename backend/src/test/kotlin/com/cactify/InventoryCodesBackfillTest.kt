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
 * «Los datos existentes reciben su código»: la migración se aplica sobre una base que **ya tiene**
 * especies y plantas, no sobre una vacía. Usa su propia base de datos dentro del mismo contenedor:
 * migra hasta `V6`, inserta, y solo entonces aplica `V7`.
 */
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class InventoryCodesBackfillTest : AbstractIntegrationTest() {

  private val database = "backfill_${System.nanoTime()}"
  private lateinit var jdbc: JdbcTemplate

  @BeforeEach
  fun createDatabase() {
    val admin = DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password)
    JdbcTemplate(admin).execute("CREATE DATABASE $database")

    val url = postgres.jdbcUrl.replaceAfterLast('/', database)
    val dataSource = DriverManagerDataSource(url, postgres.username, postgres.password)
    jdbc = JdbcTemplate(dataSource)
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

  private fun species(id: Long, name: String) = jdbc.update(
    """
    INSERT INTO species (id, scientific_name, common_name, min_humidity, max_humidity, min_temperature,
      max_temperature, min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
    VALUES (?, ?, 'Común', 10, 30, 10, 35, 6, 10, 'cada 10 dias', 100001)
    """.trimIndent(),
    id, name,
  )

  private fun plant(id: Long, speciesId: Long, createdAt: String) = jdbc.update(
    "INSERT INTO plant (id, nickname, location_id, species_id, created_at) VALUES (?, 'P', 300001, ?, ?::timestamptz)",
    id, speciesId, createdAt,
  )

  @Test
  fun `species and plants created before the migration receive their code`() {
    migrateTo("6")
    species(980001, "Ferocactus gracilis")
    species(980002, "Ferocactus latispinus") // mismo género: el desempate no puede repetir el código
    species(980003, "Schlumbergera truncata")
    plant(981003, 980001, "2026-01-03T10:00:00Z")
    plant(981001, 980001, "2026-01-01T10:00:00Z")
    plant(981002, 980001, "2026-01-02T10:00:00Z")
    plant(981004, 200001, "2026-02-01T10:00:00Z")

    migrateTo("7")

    val speciesCodes = jdbc.queryForList("SELECT code FROM species", String::class.java)
    assertEquals(speciesCodes.size, speciesCodes.toSet().size, "ningún código de especie repetido")
    assertEquals("CAT-GRUSS", jdbc.queryForObject("SELECT code FROM species WHERE id = 200001", String::class.java))
    assertEquals("CAT-SCHLU", jdbc.queryForObject("SELECT code FROM species WHERE id = 980003", String::class.java))
    val feroc = jdbc.queryForObject("SELECT code FROM species WHERE id = 980001", String::class.java)!!
    assertEquals(true, feroc.startsWith("CAT-FEROC"))
  }

  @Test
  fun `plant numbers follow the order of creation and the counter points to the next one`() {
    migrateTo("6")
    species(980001, "Ferocactus gracilis")
    plant(981003, 980001, "2026-01-03T10:00:00Z")
    plant(981001, 980001, "2026-01-01T10:00:00Z")
    plant(981002, 980001, "2026-01-02T10:00:00Z")

    migrateTo("7")

    val speciesCode = jdbc.queryForObject("SELECT code FROM species WHERE id = 980001", String::class.java)
    assertEquals("$speciesCode-01", jdbc.queryForObject("SELECT code FROM plant WHERE id = 981001", String::class.java))
    assertEquals("$speciesCode-02", jdbc.queryForObject("SELECT code FROM plant WHERE id = 981002", String::class.java))
    assertEquals("$speciesCode-03", jdbc.queryForObject("SELECT code FROM plant WHERE id = 981003", String::class.java))
    assertEquals(4, jdbc.queryForObject("SELECT next_sequence FROM species WHERE id = 980001", Int::class.java))
    assertEquals(1, jdbc.queryForObject("SELECT next_sequence FROM species WHERE id = 200002", Int::class.java))
  }

  @Test
  fun `another species keeps its own numbering and an empty species starts at 1`() {
    migrateTo("6")
    species(980001, "Ferocactus gracilis")
    plant(981001, 980001, "2026-01-01T10:00:00Z")
    plant(981004, 200001, "2026-02-01T10:00:00Z")

    migrateTo("7")

    assertEquals("CAT-GRUSS-01", jdbc.queryForObject("SELECT code FROM plant WHERE id = 981004", String::class.java))
    assertEquals(2, jdbc.queryForObject("SELECT next_sequence FROM species WHERE id = 200001", Int::class.java))
  }
}

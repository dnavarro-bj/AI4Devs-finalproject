package com.cactify

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class SchemaMigrationTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @Autowired
  lateinit var flyway: Flyway

  private val expectedTables =
    listOf("soil_mix", "species", "location", "plant", "tag", "plant_tag", "care_record", "ai_recommendation")

  @Test
  fun `restarting on an already migrated database does not reapply any migration and starts without error`() {
    val appliedBefore = flyway.info().applied().size

    flyway.migrate()

    assertEquals(appliedBefore, flyway.info().applied().size, "expected no migration to be reapplied")
  }

  @Test
  fun `the 8 tables exist with a primary key after migrating on a clean database`() {
    for (table in expectedTables) {
      val tableExists = jdbcTemplate.queryForObject(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?)",
        Boolean::class.java,
        table,
      )
      assertTrue(tableExists!!, "expected table $table to exist")

      val primaryKeyCount = jdbcTemplate.queryForObject(
        """
        SELECT count(*) FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = ? AND constraint_type = 'PRIMARY KEY'
        """.trimIndent(),
        Int::class.java,
        table,
      )
      assertEquals(1, primaryKeyCount, "expected table $table to have exactly one primary key")
    }
  }

  @Test
  fun `inserting a plant with a nonexistent species is rejected by a foreign key violation`() {
    val locationId = insertLocation()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO plant (id, nickname, location_id, species_id) VALUES (?, ?, ?, ?)",
        1001L, "Pepito", locationId, 999999L,
      )
    }
  }

  @Test
  fun `inserting a care record with a nonexistent plant is rejected by a foreign key violation`() {
    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO care_record (id, plant_id, recorded_at) VALUES (?, ?, now())",
        2001L, 999999L,
      )
    }
  }

  @Test
  fun `inserting a species without a scientific name is rejected by a not-null violation`() {
    val soilMixId = insertSoilMix()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        """
        INSERT INTO species
          (id, scientific_name, common_name, min_humidity, max_humidity, min_temperature, max_temperature,
           min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
        VALUES (?, NULL, 'Test', 10, 20, 10, 20, 6, 10, 'weekly', ?)
        """.trimIndent(),
        3001L, soilMixId,
      )
    }
  }

  @Test
  fun `inserting a care record without recorded_at is rejected by a not-null violation`() {
    val plantId = insertPlant()

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO care_record (id, plant_id, recorded_at) VALUES (?, ?, NULL)",
        4001L, plantId,
      )
    }
  }

  private fun insertSoilMix(): Long {
    val id = System.nanoTime()
    jdbcTemplate.update(
      "INSERT INTO soil_mix (id, name, organic_percentage, mineral_percentage, ph_min, ph_max) VALUES (?, 'Mix', 40, 60, 5.5, 6.5)",
      id,
    )
    return id
  }

  private fun insertLocation(): Long {
    val id = System.nanoTime()
    jdbcTemplate.update("INSERT INTO location (id, name) VALUES (?, 'Greenhouse')", id)
    return id
  }

  private fun insertSpecies(): Long {
    val soilMixId = insertSoilMix()
    val id = System.nanoTime()
    jdbcTemplate.update(
      """
      INSERT INTO species
        (id, scientific_name, common_name, min_humidity, max_humidity, min_temperature, max_temperature,
         min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
      VALUES (?, 'Test species', 'Test', 10, 20, 10, 20, 6, 10, 'weekly', ?)
      """.trimIndent(),
      id, soilMixId,
    )
    return id
  }

  private fun insertPlant(): Long {
    val locationId = insertLocation()
    val speciesId = insertSpecies()
    val id = System.nanoTime()
    jdbcTemplate.update(
      "INSERT INTO plant (id, nickname, location_id, species_id) VALUES (?, 'Pepito', ?, ?)",
      id, locationId, speciesId,
    )
    return id
  }
}

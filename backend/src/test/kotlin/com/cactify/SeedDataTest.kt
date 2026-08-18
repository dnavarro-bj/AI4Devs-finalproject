package com.cactify

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SeedDataTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @Autowired
  lateinit var flyway: Flyway

  @Test
  fun `there is at least one fully seeded species after migrating on a clean database`() {
    val completeSpeciesCount = jdbcTemplate.queryForObject(
      """
      SELECT count(*) FROM species s
      JOIN soil_mix sm ON sm.id = s.soil_mix_id
      WHERE s.scientific_name IS NOT NULL
        AND s.common_name IS NOT NULL
        AND s.min_humidity IS NOT NULL AND s.max_humidity IS NOT NULL
        AND s.min_temperature IS NOT NULL AND s.max_temperature IS NOT NULL
        AND s.min_light_hours IS NOT NULL AND s.max_light_hours IS NOT NULL
        AND s.watering_guideline IS NOT NULL
      """.trimIndent(),
      Int::class.java,
    )

    assertTrue((completeSpeciesCount ?: 0) >= 1, "expected at least one fully seeded species")
  }

  @Test
  fun `seeds cover the minimum seeded catalogs`() {
    assertTrue(countOf("soil_mix") >= 2, "expected at least 2 soil mixes")
    assertTrue(countOf("species") >= 2, "expected at least 2 species")
    assertTrue(countOf("location") >= 2, "expected at least 2 locations")
    assertTrue(countOf("tag") >= 3, "expected at least 3 tags")
  }

  @Test
  fun `seeds are not duplicated when the application restarts on the same database`() {
    val speciesBefore = countOf("species")
    val soilMixBefore = countOf("soil_mix")
    val locationBefore = countOf("location")
    val tagBefore = countOf("tag")

    flyway.migrate()

    assertEquals(speciesBefore, countOf("species"))
    assertEquals(soilMixBefore, countOf("soil_mix"))
    assertEquals(locationBefore, countOf("location"))
    assertEquals(tagBefore, countOf("tag"))
  }

  private fun countOf(table: String): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM $table", Int::class.java) ?: 0
}

package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertFailsWith

class DomainConstraintsTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @Test
  fun `a soil mix whose percentages do not add up to 100 is rejected`() {
    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO soil_mix (id, name, organic_percentage, mineral_percentage, ph_min, ph_max) VALUES (?, 'Bad mix', 30, 60, 5.5, 6.5)",
        System.nanoTime(),
      )
    }
  }

  @Test
  fun `a soil mix with an inverted pH range is rejected`() {
    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO soil_mix (id, name, organic_percentage, mineral_percentage, ph_min, ph_max) VALUES (?, 'Bad mix', 40, 60, 7.0, 5.5)",
        System.nanoTime(),
      )
    }
  }

  @Test
  fun `a species with an inverted temperature range is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertSpecies(minTemperature = 35, maxTemperature = 10) }
  }

  @Test
  fun `a species with an inverted humidity range is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertSpecies(minHumidity = 80, maxHumidity = 10) }
  }

  @Test
  fun `a species with an inverted light hours range is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertSpecies(minLightHours = 10, maxLightHours = 6) }
  }

  /** `Echinocactus grusonii` lo siembra `V2__seed.sql`, así que basta con intentar repetirlo. */
  @Test
  fun `a species whose scientific name is already taken is rejected`() {
    assertFailsWith<DataIntegrityViolationException> { insertSpecies(scientificName = "Echinocactus grusonii") }
  }

  private fun insertSpecies(
    scientificName: String = "Test species ${System.nanoTime()}",
    minHumidity: Int = 10,
    maxHumidity: Int = 30,
    minTemperature: Int = 10,
    maxTemperature: Int = 35,
    minLightHours: Int = 6,
    maxLightHours: Int = 10,
  ) = jdbcTemplate.update(
    """
    INSERT INTO species
        (id, scientific_name, common_name, min_humidity, max_humidity, min_temperature,
         max_temperature, min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
    VALUES (?, ?, 'Especie de prueba', ?, ?, ?, ?, ?, ?, 'cada 10 dias', 100001)
    """.trimIndent(),
    System.nanoTime(),
    scientificName,
    minHumidity,
    maxHumidity,
    minTemperature,
    maxTemperature,
    minLightHours,
    maxLightHours,
  )

  @Test
  fun `a tag that only differs in capitalisation or surrounding spaces is rejected as a duplicate`() {
    jdbcTemplate.update("INSERT INTO tag (id, name) VALUES (?, 'test-unique-tag')", System.nanoTime())

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update("INSERT INTO tag (id, name) VALUES (?, ' Test-Unique-Tag ')", System.nanoTime())
    }
  }

  @Test
  fun `an exact duplicate tag is rejected`() {
    jdbcTemplate.update("INSERT INTO tag (id, name) VALUES (?, 'test-unique-tag')", System.nanoTime())

    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update("INSERT INTO tag (id, name) VALUES (?, 'test-unique-tag')", System.nanoTime())
    }
  }
}

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

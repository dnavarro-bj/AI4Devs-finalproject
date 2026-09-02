package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Escenarios de "Marcas de tiempo de auditoría" que se comprueban al nivel del esquema: la red de
 * seguridad de la base de datos (ADR-002), independiente de que la aplicación selle o no.
 */
class AuditTimestampsSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  private val allTables =
    listOf("soil_mix", "species", "location", "plant", "tag", "plant_tag", "care_record", "ai_recommendation")

  @Test
  fun `every table has created_at and updated_at, both not null`() {
    for (table in allTables) {
      for (column in listOf("created_at", "updated_at")) {
        val nullable = jdbcTemplate.query(
          """
          SELECT is_nullable FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
          """.trimIndent(),
          { rs, _ -> rs.getString("is_nullable") },
          table, column,
        ).firstOrNull()

        assertNotNull(nullable, "expected $table.$column to exist")
        assertEquals("NO", nullable, "expected $table.$column to be NOT NULL")
      }
    }
  }

  @Test
  fun `a row inserted straight through SQL gets both timestamps filled in`() {
    val id = System.nanoTime()
    jdbcTemplate.update("INSERT INTO location (id, name) VALUES (?, 'Audit SQL location')", id)

    val filled = jdbcTemplate.queryForObject(
      "SELECT created_at IS NOT NULL AND updated_at IS NOT NULL FROM location WHERE id = ?",
      Boolean::class.java,
      id,
    )

    assertTrue(filled!!, "expected the database default to fill both timestamps")
  }

  @Test
  fun `a null creation timestamp is rejected`() {
    assertFailsWith<DataIntegrityViolationException> {
      jdbcTemplate.update(
        "INSERT INTO location (id, name, created_at) VALUES (?, 'Audit null location', NULL)",
        System.nanoTime(),
      )
    }
  }
}

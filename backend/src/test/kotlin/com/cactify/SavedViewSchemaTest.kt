package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios de «El nombre de una vista es único por ámbito» y las restricciones de `saved_view` (ADR-002). */
class SavedViewSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 980_000L

  private fun insert(scope: String = "plants", name: String = "Cuarentena", query: String = "", columns: String? = null) =
    jdbc.update(
      "INSERT INTO saved_view (id, scope, name, query, columns) VALUES (?, ?, ?, ?, ?)",
      ++sequence, scope, name, query, columns,
    )

  /** Una fila rechazada aborta la transacción: cada test provoca un solo rechazo y es lo último que hace. */
  private fun assertRejected(message: String, block: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { block() }
  }

  @Test
  fun `a view of each scope is accepted`() {
    insert("plants", "Mis plantas", "status=cuarentena", "species,location")
    insert("species", "Sensibles al frío", "minTemperatureFrom=9")

    assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM saved_view WHERE name IN ('Mis plantas', 'Sensibles al frío')", Int::class.java))
  }

  @Test
  fun `an unknown scope is rejected`() {
    assertRejected("ámbito desconocido") { insert("tags") }
  }

  @Test
  fun `a blank name is rejected`() {
    assertRejected("nombre en blanco") { insert(name = "   ") }
  }

  @Test
  fun `an overlong name is rejected`() {
    assertRejected("nombre demasiado largo") { insert(name = "x".repeat(101)) }
  }

  @Test
  fun `columns are only allowed in the plants scope`() {
    assertRejected("columnas en species") { insert("species", "Con columnas", columns = "species") }
  }

  @Test
  fun `the name is unique per scope without caring about case or surrounding spaces`() {
    insert("species", "Sensibles al frío")

    assertRejected("nombre repetido") { insert("species", "  SENSIBLES AL FRÍO ") }
  }

  @Test
  fun `the same name is allowed in another scope`() {
    insert("plants", "Cuarentena")
    insert("species", "Cuarentena")

    assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM saved_view WHERE name = 'Cuarentena'", Int::class.java))
  }

  @Test
  fun `existing plants and species are untouched by the migration`() {
    assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM species", Int::class.java))
  }
}

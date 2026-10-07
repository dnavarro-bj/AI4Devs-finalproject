package com.cactify.application

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * La forma canónica de una consulta, contra los **mismos vectores** que usa el frontend
 * (`contracts/canonical-query.vectors.json`): son dos implementaciones de una regla, y un grupo
 * dejaría de seleccionarse si divergieran.
 */
class CanonicalQueryTest {

  private val vectors = ObjectMapper().readTree(File("../contracts/canonical-query.vectors.json")).get("vectors")

  @Test
  fun `every shared vector gives the expected canonical form`() {
    assertTrue(vectors.size() > 10, "el archivo de vectores no se ha leído")
    vectors.forEach { vector ->
      assertEquals(vector.get("expected").asText(), CanonicalQuery.of(vector.get("input").asText()), vector.get("name").asText())
    }
  }

  @Test
  fun `the canonical form is idempotent`() {
    vectors.forEach { vector ->
      val once = CanonicalQuery.of(vector.get("input").asText())
      assertEquals(once, CanonicalQuery.of(once), vector.get("name").asText())
    }
  }

  @Test
  fun `a null query is the empty one`() {
    assertEquals("", CanonicalQuery.of(null))
  }

  @Test
  fun `the parameters are grouped by key`() {
    assertEquals(
      mapOf("species" to listOf("1", "2"), "status" to listOf("cuarentena")),
      CanonicalQuery.parameters("species=2&status=cuarentena&species=1"),
    )
  }

  @Test
  fun `a malformed percent encoding is rejected`() {
    assertFailsWith<IllegalArgumentException> { CanonicalQuery.of("q=%zz") }
  }
}

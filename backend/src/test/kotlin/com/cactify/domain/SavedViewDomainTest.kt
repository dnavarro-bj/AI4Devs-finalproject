package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

/** Invariantes de `SavedView` y del enumerado `ViewScope` (ADR-007, ADR-011). */
class SavedViewDomainTest {

  @Test
  fun `the scope has an explicit value and rejects an unknown one`() {
    assertEquals("plants", ViewScope.Plants.value)
    assertEquals("species", ViewScope.Species.value)
    assertEquals(ViewScope.Species, ViewScope("  SPECIES "))
    assertEquals("species", ViewScope.Species.toString())
    assertFailsWith<IllegalArgumentException> { ViewScope("tags") }
  }

  @Test
  fun `the name is trimmed`() {
    val view = SavedView(scope = ViewScope.Plants, name = "  Cuarentena  ", query = "status=cuarentena")

    assertEquals("Cuarentena", view.name)
  }

  @Test
  fun `a blank name is rejected`() {
    assertFailsWith<IllegalArgumentException> { SavedView(scope = ViewScope.Plants, name = "   ", query = "") }
  }

  @Test
  fun `an overlong name is rejected`() {
    assertFailsWith<IllegalArgumentException> {
      SavedView(scope = ViewScope.Plants, name = "x".repeat(SavedView.MAX_NAME_LENGTH + 1), query = "")
    }
  }

  @Test
  fun `a plants view accepts known columns and none`() {
    assertEquals(listOf("species", "location"), SavedView(scope = ViewScope.Plants, name = "a", query = "", columns = listOf("species", "location")).columns)
    assertEquals(emptyList(), SavedView(scope = ViewScope.Plants, name = "b", query = "", columns = emptyList()).columns)
    assertNull(SavedView(scope = ViewScope.Plants, name = "c", query = "").columns)
  }

  @Test
  fun `an unknown column is rejected`() {
    assertFailsWith<IllegalArgumentException> {
      SavedView(scope = ViewScope.Plants, name = "a", query = "", columns = listOf("password"))
    }
  }

  @Test
  fun `a species view cannot carry columns`() {
    assertFailsWith<IllegalArgumentException> {
      SavedView(scope = ViewScope.Species, name = "a", query = "", columns = listOf("species"))
    }
    assertFailsWith<IllegalArgumentException> {
      SavedView(scope = ViewScope.Species, name = "a", query = "", columns = emptyList())
    }
  }

  @Test
  fun `a replacement is complete and keeps the identity`() {
    val view = SavedView(scope = ViewScope.Plants, name = "Antes", query = "status=cuarentena", columns = listOf("species"))
    val id = view.id

    view.replace(ViewScope.Species, "Después", "minTemperatureFrom=9", null)

    assertEquals(id, view.id)
    assertEquals(ViewScope.Species, view.scope)
    assertEquals("Después", view.name)
    assertEquals("minTemperatureFrom=9", view.query)
    assertNull(view.columns)
  }

  @Test
  fun `a rejected replacement leaves everything as it was`() {
    val view = SavedView(scope = ViewScope.Plants, name = "Antes", query = "status=cuarentena", columns = listOf("species"))

    assertFailsWith<IllegalArgumentException> { view.replace(ViewScope.Plants, "   ", "q=x", null) }
    assertFailsWith<IllegalArgumentException> { view.replace(ViewScope.Species, "Otro", "q=x", listOf("species")) }

    assertEquals(ViewScope.Plants, view.scope)
    assertEquals("Antes", view.name)
    assertEquals("status=cuarentena", view.query)
    assertEquals(listOf("species"), view.columns)
  }
}

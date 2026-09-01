package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/**
 * Normalización del nombre de tag: lógica pura, así que se prueba sin contenedor.
 * La forma normalizada es la que compara el índice único `lower(trim(name))` de la base de datos.
 */
class TagNameTest {

  @Test
  fun `normalising trims the surrounding whitespace`() {
    assertEquals("globular", TagName.normalize(" globular "))
    assertEquals("globular", TagName.normalize("globular\t"))
  }

  @Test
  fun `normalising is case insensitive`() {
    assertEquals(TagName.normalize("globular"), TagName.normalize("Globular"))
    assertEquals(TagName.normalize("globular"), TagName.normalize(" GLOBULAR "))
  }

  @Test
  fun `the stored name keeps its capitalisation, only the surrounding spaces go`() {
    assertEquals("Globular", TagName.display(" Globular "))
    assertNotEquals(TagName.display(" Globular "), TagName.normalize(" Globular "))
  }

  @Test
  fun `different names do not normalise to the same value`() {
    assertNotEquals(TagName.normalize("globular"), TagName.normalize("pequeno"))
  }
}

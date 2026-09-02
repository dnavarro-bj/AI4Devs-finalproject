package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Escenarios "Modificación que rompería una regla" y "Modificación válida": una entidad protege su
 * consistencia también al cambiar, no solo al crearse.
 */
class LocationRenameTest {

  @Test
  fun `renaming to a blank name is rejected and leaves the previous name intact`() {
    val location = Location(name = "Invernadero 1")

    assertFailsWith<IllegalArgumentException> { location.rename("   ") }

    assertEquals("Invernadero 1", location.name, "el estado anterior debe quedar intacto")
  }

  @Test
  fun `renaming to a valid name applies the change`() {
    val location = Location(name = "Invernadero 1")

    location.rename("Invernadero 2")

    assertEquals("Invernadero 2", location.name)
  }
}

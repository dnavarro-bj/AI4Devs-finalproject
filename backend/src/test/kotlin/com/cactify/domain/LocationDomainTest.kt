package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

/** Las invariantes de `Location` (ADR-011) y los tres vocabularios cerrados de la localización (ADR-007). */
class LocationDomainTest {

  @Test
  fun `the location enums parse their persisted values, normalise and fail on the unknown`() {
    assertEquals(LocationType.OutdoorArea, LocationType(" Zona_Exterior "))
    assertEquals(LocationEnvironment.Covered, LocationEnvironment("cubierto"))
    assertEquals(LocationExposure.FullSun, LocationExposure("PLENO_SOL"))
    assertEquals("estanteria", LocationType.Shelf.toString())
    assertFailsWith<IllegalArgumentException> { LocationType("almacen") }
    assertFailsWith<IllegalArgumentException> { LocationEnvironment("ambos") }
    assertFailsWith<IllegalArgumentException> { LocationExposure("radiante") }
  }

  @Test
  fun `a blank name or code is rejected`() {
    assertFailsWith<IllegalArgumentException> { Location(name = "  ", code = "LOC-A") }
    assertFailsWith<IllegalArgumentException> { Location(name = "Bancada", code = "  ") }
  }

  @Test
  fun `a capacity that is not positive is rejected`() {
    assertFailsWith<IllegalArgumentException> { Location(name = "Bancada", code = "LOC-A", capacity = 0) }
    assertEquals(250, Location(name = "Bancada", code = "LOC-A", capacity = 250).capacity)
  }

  @Test
  fun `a location cannot be its own parent`() {
    val id = LocationId.create()
    assertFailsWith<IllegalArgumentException> { Location(id = id, name = "Bancada", code = "LOC-A", parentId = id) }
  }

  @Test
  fun `name and code are trimmed and optional text left blank is absent`() {
    val location = Location(name = " Bancada ", code = " LOC-A ", description = "   ", operationalNotes = " ")

    assertEquals("Bancada", location.name)
    assertEquals("LOC-A", location.code)
    assertNull(location.description)
    assertNull(location.operationalNotes)
  }

  @Test
  fun `update replaces everything`() {
    val parent = LocationId.create()
    val location = Location(name = "Bancada", code = "LOC-A", locationType = LocationType.Bench, capacity = 10)

    location.update("Bandeja", "LOC-B", parent, "desc", null, null, "notas", LocationEnvironment.Indoor, LocationExposure.Shade)

    assertEquals("Bandeja", location.name)
    assertEquals("LOC-B", location.code)
    assertEquals(parent, location.parentId)
    assertEquals("desc", location.description)
    assertNull(location.locationType, "el reemplazo completo deja ausente lo que no se indica")
    assertNull(location.capacity)
    assertEquals(LocationEnvironment.Indoor, location.environment)
    assertEquals(LocationExposure.Shade, location.sunExposure)
  }

  @Test
  fun `a rejected update leaves the location untouched`() {
    val location = Location(name = "Bancada", code = "LOC-A", capacity = 10)

    assertFailsWith<IllegalArgumentException> {
      location.update("Otra", "LOC-B", null, null, null, 0, null, null, null)
    }

    assertEquals("Bancada", location.name)
    assertEquals("LOC-A", location.code)
    assertEquals(10, location.capacity)
  }
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.web.errors.ApiExceptionHandler
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockHttpServletRequest

/**
 * La carrera entre la comprobación de duplicado de `SpeciesService` y el `INSERT`: dos altas
 * simultáneas pasan las dos la comprobación y a la segunda la rechaza el `UNIQUE` de `V6__` al
 * vaciar la sesión, ya fuera del servicio.
 *
 * No se puede provocar de forma determinista con dos peticiones, así que se ejercita el punto
 * donde acaba esa violación —el manejador global— saltándose el servicio: lo que se comprueba es
 * que la restricción del nombre científico se traduce a `409` y que cualquier otra violación de
 * integridad se propaga en vez de disfrazarse de conflicto del cliente.
 */
class SpeciesUniquenessRaceTest : AbstractApiIntegrationTest() {

  @Autowired
  lateinit var handler: ApiExceptionHandler

  private val request = MockHttpServletRequest("POST", "/species")

  @Test
  fun `a unique violation on the scientific name is translated to 409`() {
    val violation = DataIntegrityViolationException(
      "could not execute statement",
      IllegalStateException(
        """ERROR: duplicate key value violates unique constraint "species_scientific_name_unique"""",
      ),
    )

    val response = handler.onIntegrityViolation(violation, request)

    assertEquals(HttpStatus.CONFLICT, response.statusCode)
    assertEquals(409, response.body?.status)
    assertEquals("/species", response.body?.path)
  }

  @Test
  fun `any other integrity violation is not disguised as a conflict`() {
    val violation = DataIntegrityViolationException(
      "could not execute statement",
      IllegalStateException("""ERROR: new row violates check constraint "species_humidity_range_valid""""),
    )

    assertFailsWith<DataIntegrityViolationException> { handler.onIntegrityViolation(violation, request) }
  }
}

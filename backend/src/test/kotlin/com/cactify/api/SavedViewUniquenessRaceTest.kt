package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.web.errors.ApiExceptionHandler
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.mock.web.MockHttpServletRequest
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * La carrera entre la comprobación de duplicado de `SavedViewService` y el `INSERT`: dos altas
 * simultáneas pasan las dos la comprobación y a la segunda la frena el índice único al vaciar la
 * sesión, ya fuera del servicio. No se puede provocar de forma determinista con dos peticiones, así
 * que se ejercita donde acaba esa violación —el manejador global—, como en `SpeciesUniquenessRaceTest`.
 */
class SavedViewUniquenessRaceTest : AbstractApiIntegrationTest() {

  @Autowired
  lateinit var handler: ApiExceptionHandler

  private val request = MockHttpServletRequest("POST", "/saved-views")

  @Test
  fun `a violation of the unique name index is translated to 409`() {
    val violation = DataIntegrityViolationException(
      "could not execute statement",
      IllegalStateException("""ERROR: duplicate key value violates unique constraint "saved_view_scope_name_unique""""),
    )

    val response = handler.onIntegrityViolation(violation, request)

    assertEquals(HttpStatus.CONFLICT, response.statusCode)
    assertEquals(409, response.body?.status)
    assertEquals("/saved-views", response.body?.path)
  }

  @Test
  fun `any other integrity violation is not disguised as a conflict`() {
    val violation = DataIntegrityViolationException(
      "could not execute statement",
      IllegalStateException("""ERROR: new row violates check constraint "saved_view_scope_valid""""),
    )

    assertFailsWith<DataIntegrityViolationException> { handler.onIntegrityViolation(violation, request) }
  }
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de "Acceso al API desde un origen distinto". El navegador sirve el frontend desde
 * `:3000` y el API vive en `:8080`: sin CORS ninguna llamada del cliente llega.
 */
class CorsApiTest : AbstractApiIntegrationTest() {

  private val browserOrigin = "http://localhost:3000"

  @Test
  fun `a read from another origin is authorised`() {
    mockMvc.perform(get("/plants").header(HttpHeaders.ORIGIN, browserOrigin))
      .andExpect(status().isOk)
      .andExpect(header().exists("Access-Control-Allow-Origin"))
  }

  @Test
  fun `the preflight of a POST with a JSON body authorises the method and the headers`() {
    mockMvc.perform(
      options("/plants")
        .header(HttpHeaders.ORIGIN, browserOrigin)
        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type"),
    )
      .andExpect(status().isOk)
      .andExpect(header().exists("Access-Control-Allow-Origin"))
      .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("POST")))
      .andExpect(header().string("Access-Control-Allow-Headers", org.hamcrest.Matchers.containsString("Content-Type")))
  }

  /** El preflight se aplica a todas las rutas, incluidas las que el API no expone. */
  @Test
  fun `the preflight of an unknown route is not a server error`() {
    val status = mockMvc.perform(
      options("/no-existe")
        .header(HttpHeaders.ORIGIN, browserOrigin)
        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"),
    ).andReturn().response.status

    kotlin.test.assertTrue(status < 500, "un preflight nunca debe ser 5xx, y fue $status")
  }
}

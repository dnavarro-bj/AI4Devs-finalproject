package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de "Formato uniforme de los errores del API" (decisión 5 del design). */
class ApiErrorFormatTest : AbstractApiIntegrationTest() {

  @Test
  fun `a validation error answers 400 with the uniform error body`() {
    mockMvc.perform(
      post("/locations")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "   ")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.error").value("Bad Request"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/locations"))
  }

  @Test
  fun `a resource missing from the path answers 404 with the same error body`() {
    mockMvc.perform(get("/plants/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.error").value("Not Found"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/plants/999999999"))
  }
}

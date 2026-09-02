package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Envelope de paginación y límites configurables (decisión 9 del design), comunes a los tres
 * listados. Los escenarios por listado viven en los tests de cada catálogo y del inventario.
 */
class PaginationEnvelopeTest : AbstractApiIntegrationTest() {

  private val defaultPageSize = 25
  private val maxPageSize = 500

  @Test
  fun `a listing without page or size returns the first page with the configured default size`() {
    mockMvc.perform(get("/tags"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content").isArray)
      .andExpect(jsonPath("$.totalElements").isNumber)
      .andExpect(jsonPath("$.totalPages").isNumber)
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(defaultPageSize))
  }

  @Test
  fun `a size above the configured maximum is trimmed to the maximum`() {
    mockMvc.perform(get("/tags").param("size", "1000"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.pageSize").value(maxPageSize))
  }

  @Test
  fun `the envelope has the same shape on every listing`() {
    for (path in listOf("/tags", "/locations", "/species", "/plants")) {
      mockMvc.perform(get(path))
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.content").isArray)
        .andExpect(jsonPath("$.totalElements").isNumber)
        .andExpect(jsonPath("$.totalPages").isNumber)
        .andExpect(jsonPath("$.pageNumber").value(0))
        .andExpect(jsonPath("$.pageSize").value(defaultPageSize))
    }
  }
}

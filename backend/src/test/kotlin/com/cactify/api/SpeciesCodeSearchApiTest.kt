package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Filtro del catálogo de especies por código». Las semillas son CAT-GRUSS, CAT-MAMMI y CAT-ECHEV. */
class SpeciesCodeSearchApiTest : AbstractApiIntegrationTest() {

  private fun search(code: String?) =
    mockMvc.perform(get("/species").apply { if (code != null) param("code", code) })

  @Test
  fun `the code finds the species without caring about case`() {
    search("cat-gruss")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS"))
  }

  @Test
  fun `a partial text finds the species whose code includes it`() {
    search("mamm")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-MAMMI"))
  }

  @Test
  fun `a text shared by several codes finds them all, in the stable order`() {
    search("CAT")
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[0].scientificName").value("Echeveria elegans"))
  }

  @Test
  fun `a blank text returns the whole catalog`() {
    search("  ").andExpect(jsonPath("$.totalElements").value(3))
    search("").andExpect(jsonPath("$.totalElements").value(3))
    search(null).andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `a text that is in no code returns an empty page`() {
    search("NO-EXISTE")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
      .andExpect(jsonPath("$.content.length()").value(0))
  }

  @Test
  fun `the wildcards are literal text`() {
    search("%").andExpect(jsonPath("$.totalElements").value(0))
    search("_").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the filter respects the pagination`() {
    mockMvc.perform(get("/species").param("code", "cat").param("size", "2"))
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.content.length()").value(2))
  }
}

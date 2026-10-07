package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsInAnyOrder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Búsqueda de texto en localizaciones y etiquetas», la parte de etiquetas. */
class TagSearchApiTest : AbstractApiIntegrationTest() {

  @BeforeEach
  fun emptyCatalog() {
    clearTags()
    listOf("globular", "globulares", "columnar", "sin_riego", "100% sol").forEach(::createTag)
  }

  private fun createTag(name: String) {
    mockMvc.perform(post("/tags").contentType(MediaType.APPLICATION_JSON).content(json("name" to name)))
      .andExpect(status().isCreated)
  }

  private fun search(text: String?) =
    mockMvc.perform(get("/tags").apply { if (text != null) param("q", text) })

  @Test
  fun `similar tags are found together`() {
    search("glob")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].name").value(containsInAnyOrder("globular", "globulares")))
      .andExpect(jsonPath("$.content[0].plantCount").value(0))
  }

  @Test
  fun `the text does not distinguish case`() {
    search("COLUMN").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the wildcards are literal text`() {
    search("_").andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].name").value("sin_riego"))
    search("%").andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].name").value("100% sol"))
  }

  @Test
  fun `a blank text does not filter`() {
    search("  ").andExpect(jsonPath("$.totalElements").value(5))
    search(null).andExpect(jsonPath("$.totalElements").value(5))
  }

  @Test
  fun `a text that matches nothing is an empty page`() {
    search("zzz")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the search respects the pagination`() {
    mockMvc.perform(get("/tags").param("q", "glob").param("size", "1"))
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.content.length()").value(1))
  }
}

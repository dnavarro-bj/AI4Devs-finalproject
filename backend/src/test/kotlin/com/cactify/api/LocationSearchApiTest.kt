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

/** Escenarios de «Búsqueda de texto en localizaciones y etiquetas», la parte de localizaciones. */
class LocationSearchApiTest : AbstractApiIntegrationTest() {

  @BeforeEach
  fun emptyCatalog() {
    clearLocations()
    create("Invernadero 1", "LOC-INV-1")
    create("Invernadero 2", "LOC-INV-2")
    create("Alfeizar salón", "LOC-ALF")
    create("Zona 100% sol", "LOC-SOL_1")
  }

  private fun create(name: String, code: String): String {
    val body = mockMvc.perform(
      post("/locations").contentType(MediaType.APPLICATION_JSON).content(json("name" to name, "code" to code)),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(body).get("id").asText()
  }

  private fun search(text: String?) =
    mockMvc.perform(get("/locations").apply { if (text != null) param("q", text) })

  @Test
  fun `a location is found by a part of its name`() {
    search("invernadero")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].name").value(containsInAnyOrder("Invernadero 1", "Invernadero 2")))
  }

  @Test
  fun `a location is found by a part of its code, without caring about case`() {
    search("loc-alf")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].name").value("Alfeizar salón"))
  }

  @Test
  fun `the text matches the name or the code`() {
    search("inv").andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `the wildcards are literal text`() {
    search("%").andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].name").value("Zona 100% sol"))
    search("_").andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].code").value("LOC-SOL_1"))
  }

  @Test
  fun `a blank text does not filter`() {
    search("   ").andExpect(jsonPath("$.totalElements").value(4))
    search("").andExpect(jsonPath("$.totalElements").value(4))
    search(null).andExpect(jsonPath("$.totalElements").value(4))
  }

  @Test
  fun `a text that matches nothing is an empty page, not an error`() {
    search("no-existe")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
      .andExpect(jsonPath("$.content.length()").value(0))
  }

  @Test
  fun `the search keeps the pagination envelope and the plant counts`() {
    mockMvc.perform(get("/locations").param("q", "invernadero").param("size", "1"))
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.content.length()").value(1))
      .andExpect(jsonPath("$.content[0].plantCount").value(0))
      .andExpect(jsonPath("$.content[0].plantCountTotal").value(0))
      .andExpect(jsonPath("$.content[0].path").exists())
  }

  @Test
  fun `the text combines with the root and parent filters`() {
    val parent = create("Vivero norte", "LOC-NORTE")
    mockMvc.perform(
      post("/locations").contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Invernadero 3", "code" to "LOC-INV-3", "parentId" to parent)),
    ).andExpect(status().isCreated)

    mockMvc.perform(get("/locations").param("q", "invernadero").param("root", "true"))
      .andExpect(jsonPath("$.totalElements").value(2))
    mockMvc.perform(get("/locations").param("q", "invernadero").param("parentId", parent))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].name").value("Invernadero 3"))
  }
}

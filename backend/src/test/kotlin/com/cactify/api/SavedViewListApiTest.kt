package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.contains
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Listado de vistas». */
class SavedViewListApiTest : AbstractApiIntegrationTest() {

  private fun save(scope: String, name: String, query: String = "") {
    mockMvc.perform(
      post("/saved-views").contentType(MediaType.APPLICATION_JSON)
        .content(json("scope" to scope, "name" to name, "query" to query)),
    ).andExpect(status().isCreated)
  }

  @Test
  fun `the list is filtered by scope`() {
    save("plants", "Cuarentena")
    save("plants", "Enfermas")
    save("species", "Sensibles al frío", "minTemperatureFrom=9")

    mockMvc.perform(get("/saved-views").param("scope", "species"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].name").value("Sensibles al frío"))

    mockMvc.perform(get("/saved-views").param("scope", "plants"))
      .andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `without a scope all the views are listed`() {
    save("plants", "Cuarentena")
    save("species", "Sensibles al frío", "minTemperatureFrom=9")

    mockMvc.perform(get("/saved-views")).andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `an unknown scope answers 400`() {
    mockMvc.perform(get("/saved-views").param("scope", "tags")).andExpect(status().isBadRequest)
  }

  @Test
  fun `without views the page is empty`() {
    mockMvc.perform(get("/saved-views"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
      .andExpect(jsonPath("$.content.length()").value(0))
  }

  @Test
  fun `the list is ordered by name and paginated with the envelope`() {
    save("plants", "Charlie")
    save("plants", "Alfa")
    save("plants", "Bravo")

    mockMvc.perform(get("/saved-views").param("size", "2"))
      .andExpect(jsonPath("$.content[*].name").value(contains("Alfa", "Bravo")))
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.pageSize").value(2))
  }

  @Test
  fun `an order key that is not public answers 400`() {
    mockMvc.perform(get("/saved-views").param("sort", "query,asc")).andExpect(status().isBadRequest)
  }
}

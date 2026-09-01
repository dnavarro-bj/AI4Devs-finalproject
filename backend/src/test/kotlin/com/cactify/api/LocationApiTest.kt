package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de "Alta de localizaciones", "Listado de localizaciones" y su paginación. */
class LocationApiTest : AbstractApiIntegrationTest() {

  @Test
  fun `a location is created correctly`() {
    mockMvc.perform(
      post("/locations")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Invernadero 1")),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.name").value("Invernadero 1"))
  }

  @Test
  fun `a location without a name is rejected with 400 and none is created`() {
    val before = countLocations()

    mockMvc.perform(
      post("/locations")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "   ")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    kotlin.test.assertEquals(before, countLocations(), "no debía crearse ninguna localización")
  }

  @Test
  fun `the catalog lists the registered locations`() {
    clearLocations()
    createLocation("Invernadero 1")
    createLocation("Bandeja A3")

    mockMvc.perform(get("/locations"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].name").value(hasItems("Bandeja A3", "Invernadero 1")))
      .andExpect(jsonPath("$.content[0].id").isNotEmpty)
  }

  @Test
  fun `a location just created shows up in the catalog`() {
    createLocation("Alfeizar recien creado")

    mockMvc.perform(get("/locations").param("size", "500"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[*].name").value(hasItems("Alfeizar recien creado")))
  }

  @Test
  fun `5 locations with page size 2 answer 2 elements, 5 total and 3 pages`() {
    clearLocations()
    repeat(5) { createLocation("Localizacion $it") }

    mockMvc.perform(get("/locations").param("page", "0").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(2))
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(2))
  }

  private fun createLocation(name: String) {
    mockMvc.perform(
      post("/locations")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to name)),
    ).andExpect(status().isCreated)
  }

  private fun countLocations(): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM location", Int::class.java) ?: 0
}

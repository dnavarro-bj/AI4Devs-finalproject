package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsInAnyOrder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de "Listado del inventario con filtros combinables". */
class PlantSearchApiTest : AbstractApiIntegrationTest() {

  private val speciesId = "200001"
  private val greenhouse = "300001"
  private val trayA3 = "300002"
  private val globular = "400001"
  private val small = "400002"
  private val hybrid = "400004"

  @BeforeEach
  fun setUpInventory() {
    clearPlants()
    // Invernadero 1: globular+pequeno, solo globular, sin tags. Bandeja A3: globular, hibrido.
    tag(plant("Ambos tags", greenhouse), globular, small)
    tag(plant("Solo globular", greenhouse), globular)
    plant("Sin tags", greenhouse)
    tag(plant("Globular en bandeja", trayA3), globular)
    tag(plant("Hibrido en bandeja", trayA3), hybrid)
  }

  @Test
  fun `without filters the listing returns the whole inventory`() {
    mockMvc.perform(get("/plants"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.content.length()").value(5))
  }

  @Test
  fun `filtering by location returns only the plants in it`() {
    mockMvc.perform(get("/plants").param("location", trayA3))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Globular en bandeja", "Hibrido en bandeja")))
  }

  @Test
  fun `filtering by one tag returns only the plants carrying it`() {
    mockMvc.perform(get("/plants").param("tag", globular))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(
        jsonPath("$.content[*].nickname")
          .value(containsInAnyOrder("Ambos tags", "Solo globular", "Globular en bandeja")),
      )
  }

  @Test
  fun `filtering by several tags is conjunctive, so one tag alone is not enough`() {
    mockMvc.perform(get("/plants").param("tag", globular).param("tag", small))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Ambos tags")))
  }

  @Test
  fun `tag and location filters combine`() {
    mockMvc.perform(get("/plants").param("tag", globular).param("location", trayA3))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Globular en bandeja")))
  }

  @Test
  fun `a filter combination nothing satisfies answers 200 with empty content`() {
    mockMvc.perform(get("/plants").param("tag", hybrid).param("location", greenhouse))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `filtering by a nonexistent reference answers 200 with empty content, not a 500`() {
    mockMvc.perform(get("/plants").param("tag", "999999999"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(0))

    mockMvc.perform(get("/plants").param("location", "999999999"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the total reflects the filter, not the whole inventory`() {
    mockMvc.perform(get("/plants").param("tag", globular).param("size", "1"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(1))
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.totalPages").value(3))
  }

  private fun plant(nickname: String, locationId: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to speciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun tag(plantId: String, vararg tagIds: String) {
    mockMvc.perform(
      put("/plants/$plantId/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("tagIds" to tagIds.toList()))),
    ).andExpect(status().isOk)
  }
}

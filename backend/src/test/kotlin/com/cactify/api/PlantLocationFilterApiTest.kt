package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** El filtro por localización con y sin descendientes del listado del inventario. */
class PlantLocationFilterApiTest : AbstractApiIntegrationTest() {

  private val greenhouse by lazy { location("Invernadero 1", "LOC-F-I1") }
  private val bench by lazy { location("Bancada norte", "LOC-F-BN", greenhouse) }
  private val tray by lazy { location("Bandeja A3", "LOC-F-A3", bench) }
  private val other by lazy { location("Otra zona", "LOC-F-OZ") }

  @Test
  fun `without descendants the filter only returns the plants that are directly there`() {
    plants(bench, 2)
    plants(tray, 3)

    mockMvc.perform(get("/plants").param("location", bench))
      .andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `with descendants the filter adds the plants of every sublocation at any depth`() {
    plants(greenhouse, 1)
    plants(bench, 2)
    plants(tray, 3)
    plants(other, 4)

    mockMvc.perform(get("/plants").param("location", greenhouse).param("includeDescendants", "true").param("size", "50"))
      .andExpect(jsonPath("$.totalElements").value(6))
    mockMvc.perform(get("/plants").param("location", bench).param("includeDescendants", "true"))
      .andExpect(jsonPath("$.totalElements").value(5))
  }

  @Test
  fun `the total of the filtered page matches the total count of the location`() {
    plants(bench, 2)
    plants(tray, 3)

    val total = objectMapper.readTree(mockMvc.perform(get("/locations/$bench")).andReturn().response.contentAsString)
      .get("plantCountTotal").asInt()

    mockMvc.perform(get("/plants").param("location", bench).param("includeDescendants", "true"))
      .andExpect(jsonPath("$.totalElements").value(total))
  }

  @Test
  fun `a location that does not exist gives an empty page, with or without descendants`() {
    plants(bench, 1)

    mockMvc.perform(get("/plants").param("location", "999999999").param("includeDescendants", "true"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
    mockMvc.perform(get("/plants").param("location", "999999999"))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  private fun location(name: String, code: String, parent: String? = null): String {
    val body = if (parent == null) json("name" to name, "code" to code) else json("name" to name, "code" to code, "parentId" to parent)
    val response = mockMvc.perform(post("/locations").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun plants(locationId: String, count: Int) = repeat(count) {
    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "P$it", "locationId" to locationId, "speciesId" to "200001")),
    ).andExpect(status().isCreated)
  }
}

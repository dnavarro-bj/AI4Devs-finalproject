package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.everyItem
import org.hamcrest.Matchers.hasItems
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.hamcrest.Matchers.`is` as isEqual

/** Escenarios de «Inventario por estado»: lo archivado no se mezcla con lo que está en curso. */
class PlantStatusFilterApiTest : AbstractApiIntegrationTest() {

  private fun createPlant(locationId: String = "300001", status: String? = null): String {
    val pairs = mutableListOf<Pair<String, Any?>>("nickname" to "Bola", "locationId" to locationId, "speciesId" to "200001")
    if (status != null) pairs.add("status" to status)
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON).content(json(*pairs.toTypedArray())),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun changeStatus(id: String, to: String) {
    mockMvc.perform(
      put("/plants/$id/status").contentType(MediaType.APPLICATION_JSON).content(json("status" to to)),
    ).andExpect(status().isOk)
  }

  /** Dos activas (una en la localización 2), una en cuarentena, una vendida y una muerta. */
  private fun seed() {
    clearPlants()
    createPlant()
    createPlant("300002")
    createPlant(status = "cuarentena")
    changeStatus(createPlant(), "vendida")
    changeStatus(createPlant("300002"), "muerta")
  }

  @Test
  fun `without a filter only the plants in progress come back`() {
    seed()

    mockMvc.perform(get("/plants"))
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].status").value(everyItem(not(isEqual("vendida")))))
      .andExpect(jsonPath("$.content[*].status").value(everyItem(not(isEqual("muerta")))))
  }

  @Test
  fun `a final status can be asked for explicitly`() {
    seed()

    mockMvc.perform(get("/plants").param("status", "vendida"))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].status").value("vendida"))
  }

  @Test
  fun `several statuses are an OR, finals included`() {
    seed()

    mockMvc.perform(get("/plants").param("status", "activa").param("status", "muerta"))
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].status").value(hasItems("activa", "muerta")))
  }

  @Test
  fun `a status that does not exist answers 400`() {
    mockMvc.perform(get("/plants").param("status", "fantasma")).andExpect(status().isBadRequest)
  }

  @Test
  fun `the status filter combines with the location`() {
    seed()

    mockMvc.perform(get("/plants").param("status", "activa").param("location", "300002"))
      .andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the total of the envelope counts only what the filter lets through`() {
    seed()

    mockMvc.perform(get("/plants").param("status", "vendida").param("status", "muerta"))
      .andExpect(jsonPath("$.totalElements").value(2))
    mockMvc.perform(get("/plants"))
      .andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `the listing carries the status of each plant`() {
    seed()

    mockMvc.perform(get("/plants"))
      .andExpect(jsonPath("$.content[*].status").value(hasItems("activa", "cuarentena")))
  }

  @Test
  fun `a plant that comes back to active shows up again`() {
    clearPlants()
    val id = createPlant()
    changeStatus(id, "perdida")
    mockMvc.perform(get("/plants")).andExpect(jsonPath("$.totalElements").value(0))

    mockMvc.perform(
      put("/plants/$id/status").contentType(MediaType.APPLICATION_JSON)
        .content(json("status" to "activa", "reason" to "Apareció")),
    ).andExpect(status().isOk)

    mockMvc.perform(get("/plants")).andExpect(jsonPath("$.totalElements").value(1))
  }
}

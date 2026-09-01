package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de "Detalle de una planta". */
class PlantDetailApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `the detail carries the care data inherited from the species`() {
    val plantId = createPlant("Bola detalle")

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(plantId))
      .andExpect(jsonPath("$.nickname").value("Bola detalle"))
      .andExpect(jsonPath("$.location.name").value("Invernadero 1"))
      .andExpect(jsonPath("$.tags").isArray)
      .andExpect(jsonPath("$.species.scientificName").value("Echinocactus grusonii"))
      .andExpect(jsonPath("$.species.commonName").value("Asiento de suegra"))
      .andExpect(jsonPath("$.species.minHumidity").value(10))
      .andExpect(jsonPath("$.species.maxHumidity").value(30))
      .andExpect(jsonPath("$.species.minTemperature").value(10))
      .andExpect(jsonPath("$.species.maxTemperature").value(35))
      .andExpect(jsonPath("$.species.minLightHours").value(6))
      .andExpect(jsonPath("$.species.maxLightHours").value(10))
      .andExpect(jsonPath("$.species.wateringGuideline").isNotEmpty)
  }

  @Test
  fun `the detail of a plant with no tags has an empty tag list`() {
    val plantId = createPlant("Bola sin tags")

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.tags").isArray)
      .andExpect(jsonPath("$.tags.length()").value(0))
  }

  @Test
  fun `a nonexistent plant answers 404 with the error body, not a 500`() {
    mockMvc.perform(get("/plants/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  private fun createPlant(nickname: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }
}

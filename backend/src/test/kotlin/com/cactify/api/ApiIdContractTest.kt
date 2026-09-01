package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.instanceOf
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de "Identificadores en el contrato del API": los ids viajan como cadena decimal,
 * en las respuestas y en las peticiones (decisión 3b del design).
 */
class ApiIdContractTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `identifiers are serialised as JSON strings, not numbers`() {
    mockMvc.perform(get("/locations"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].id").value(instanceOf<Any>(String::class.java)))

    val plantId = createPlant("Bola contrato")

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(instanceOf<Any>(String::class.java)))
      .andExpect(jsonPath("$.location.id").value(instanceOf<Any>(String::class.java)))
      .andExpect(jsonPath("$.species.id").value(instanceOf<Any>(String::class.java)))
  }

  @Test
  fun `a numeric string is accepted as an identifier on the way in`() {
    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola entrada", "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.location.id").value(seededLocationId))
      .andExpect(jsonPath("$.species.id").value(seededSpeciesId))
  }

  @Test
  fun `a non-numeric identifier is a 400, never a 500`() {
    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola mala", "locationId" to seededLocationId, "speciesId" to "no-soy-un-id")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))

    mockMvc.perform(get("/plants/no-soy-un-id"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
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

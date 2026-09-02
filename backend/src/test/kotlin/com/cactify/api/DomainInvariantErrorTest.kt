package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenario "Una regla violada no es un fallo interno del servidor": cuando una invariante del
 * dominio rechaza el estado, la respuesta sale con el cuerpo de error uniforme del API.
 *
 * Se provoca por la vía que hoy alcanza el dominio sin que `web` la ataje: una lectura cuyos
 * valores son todos vacíos, que la entidad rechaza por su regla "al menos un valor".
 */
class DomainInvariantErrorTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `a violated invariant answers 400 with the uniform error body, never 500`() {
    val plantId = createPlant("Bola de invariantes")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{}"),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.error").value("Bad Request"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/plants/$plantId/care-records"))
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

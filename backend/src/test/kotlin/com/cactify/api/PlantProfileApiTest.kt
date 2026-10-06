package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Ficha ampliada del ejemplar» y de «Estado de un ejemplar» (el alta y la edición). */
class PlantProfileApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001"
  private val greenhouse = "300001"

  private fun body(vararg extra: Pair<String, Any?>): String =
    json("nickname" to "Bola", "locationId" to greenhouse, "speciesId" to grusonii, *extra)

  private fun create(vararg extra: Pair<String, Any?>): ResultActions =
    mockMvc.perform(post("/plants").contentType(MediaType.APPLICATION_JSON).content(body(*extra)))

  private fun update(id: String, vararg extra: Pair<String, Any?>): ResultActions =
    mockMvc.perform(put("/plants/$id").contentType(MediaType.APPLICATION_JSON).content(body(*extra)))

  private fun createdId(vararg extra: Pair<String, Any?>): String =
    objectMapper.readTree(create(*extra).andExpect(status().isCreated).andReturn().response.contentAsString).get("id").asText()

  // --- Ficha ---

  @Test
  fun `a creation with the full profile answers 201 with what was sent`() {
    create(
      "description" to "Ejemplar adulto",
      "germinationYear" to 2021,
      "germinationMonth" to 4,
      "acquiredOn" to "2022-03-01",
      "origin" to "intercambio",
      "originNote" to "Con un vecino",
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.description").value("Ejemplar adulto"))
      .andExpect(jsonPath("$.germinationYear").value(2021))
      .andExpect(jsonPath("$.germinationMonth").value(4))
      .andExpect(jsonPath("$.acquiredOn").value("2022-03-01"))
      .andExpect(jsonPath("$.origin").value("intercambio"))
      .andExpect(jsonPath("$.originNote").value("Con un vecino"))
  }

  @Test
  fun `a germination with only the year is kept without an invented month`() {
    create("germinationYear" to 2021)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.germinationYear").value(2021))
      .andExpect(jsonPath("$.germinationMonth").doesNotExist())
  }

  @Test
  fun `a month without a year answers 400 and explains it`() {
    create("germinationMonth" to 4)
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(containsString("año")))
  }

  @Test
  fun `a month out of range answers 400`() {
    create("germinationYear" to 2021, "germinationMonth" to 13).andExpect(status().isBadRequest)
    create("germinationYear" to 2021, "germinationMonth" to 0).andExpect(status().isBadRequest)
  }

  @Test
  fun `an origin outside the list answers 400, not 500`() {
    create("origin" to "robado")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  @Test
  fun `a creation without the optional fields has them absent`() {
    create()
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.description").doesNotExist())
      .andExpect(jsonPath("$.germinationYear").doesNotExist())
      .andExpect(jsonPath("$.acquiredOn").doesNotExist())
      .andExpect(jsonPath("$.origin").doesNotExist())
      .andExpect(jsonPath("$.originNote").doesNotExist())
  }

  @Test
  fun `the detail carries the profile`() {
    val id = createdId("description" to "Texto", "origin" to "vivero")

    mockMvc.perform(get("/plants/$id"))
      .andExpect(jsonPath("$.description").value("Texto"))
      .andExpect(jsonPath("$.origin").value("vivero"))
  }

  @Test
  fun `an edit is a full replacement and drops what is not sent`() {
    val id = createdId("description" to "Antigua", "germinationYear" to 2020)

    update(id, "description" to "Nueva")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.description").value("Nueva"))
      .andExpect(jsonPath("$.germinationYear").doesNotExist())
  }

  @Test
  fun `a blank description is stored as absent`() {
    create("description" to "   ")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.description").doesNotExist())
  }

  @Test
  fun `a text is stored without surrounding spaces`() {
    create("description" to "  Texto  ").andExpect(jsonPath("$.description").value("Texto"))
  }

  @Test
  fun `an edit that breaks the germination rule changes nothing`() {
    val id = createdId("description" to "Antigua", "germinationYear" to 2020, "germinationMonth" to 5)

    update(id, "description" to "Nueva", "germinationMonth" to 5).andExpect(status().isBadRequest)

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.description").value("Antigua"))
  }

  // --- Estado en el alta y en la edición ---

  @Test
  fun `a plant is born active by default`() {
    create().andExpect(jsonPath("$.status").value("activa"))
  }

  @Test
  fun `a plant can be born in quarantine with no status change recorded`() {
    val id = createdId("status" to "cuarentena")

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.status").value("cuarentena"))
    mockMvc.perform(get("/plants/$id/status-changes")).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a plant cannot be born in a final status`() {
    clearPlants()

    create("status" to "muerta").andExpect(status().isBadRequest)

    mockMvc.perform(get("/plants").param("status", "muerta")).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a status that does not exist answers 400`() {
    create("status" to "fantasma").andExpect(status().isBadRequest)
  }

  @Test
  fun `editing the sheet ignores a status sent in the body`() {
    val id = createdId()

    update(id, "status" to "vendida")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("activa"))
  }
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de "Alta de una planta" y "Validación de las referencias de una planta". */
class PlantCreationApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `a plant with a valid species and location answers 201 with what was sent`() {
    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola 1", "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.nickname").value("Bola 1"))
      .andExpect(jsonPath("$.location.id").value(seededLocationId))
      .andExpect(jsonPath("$.location.name").value("Invernadero 1"))
      .andExpect(jsonPath("$.species.id").value(seededSpeciesId))
      .andExpect(jsonPath("$.species.scientificName").value("Echinocactus grusonii"))
      .andExpect(jsonPath("$.createdAt").isNotEmpty)
  }

  @Test
  fun `the created plant shows up in the inventory listing`() {
    clearPlants()
    createPlant("Bola inventario")

    mockMvc.perform(get("/plants"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[*].nickname").value(hasItems("Bola inventario")))
  }

  @Test
  fun `a plant without a nickname is rejected with 400 and none is created`() {
    val before = countPlants()

    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "   ", "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    assertEquals(before, countPlants(), "no debía crearse ninguna planta")
  }

  @Test
  fun `a nonexistent species is rejected with 400 identifying the reference`() {
    val before = countPlants()

    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola sin especie", "locationId" to seededLocationId, "speciesId" to "999999999")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("especie")))

    assertEquals(before, countPlants())
  }

  @Test
  fun `a nonexistent location is rejected with 400 identifying the reference`() {
    val before = countPlants()

    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola sin sitio", "locationId" to "999999999", "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("localización")))

    assertEquals(before, countPlants())
  }

  @Test
  fun `a malformed identifier is a 400, not a 500`() {
    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola mal id", "locationId" to seededLocationId, "speciesId" to "esto-no-es-un-id")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  private fun createPlant(nickname: String) {
    mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    ).andExpect(status().isCreated)
  }

  private fun countPlants(): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM plant", Int::class.java) ?: 0
}

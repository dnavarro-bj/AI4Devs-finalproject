package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsInAnyOrder
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de "Edición de una planta" y de la edición en "Validación de las referencias de una planta". */
class PlantUpdateApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001"
  private val elongata = "200002"
  private val greenhouse = "300001"
  private val tray = "300002"

  // --- Edición ---

  @Test
  fun `a corrected nickname answers 200 and shows up in the detail and the listing`() {
    clearPlants()
    val id = createPlant("Bola 1")

    update(id, nickname = "Bola corregida")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.nickname").value("Bola corregida"))

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.nickname").value("Bola corregida"))
    mockMvc.perform(get("/plants")).andExpect(jsonPath("$.content[0].nickname").value("Bola corregida"))
  }

  @Test
  fun `a nickname with surrounding spaces is stored trimmed`() {
    val id = createPlant("Bola 1")

    update(id, nickname = "  Bola 2  ")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.nickname").value("Bola 2"))
  }

  @Test
  fun `changing the location shows in the detail and the old location no longer lists the plant`() {
    clearPlants()
    val id = createPlant("Bola 1")

    update(id, locationId = tray)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.location.id").value(tray))

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.location.name").value("Bandeja A3"))
    mockMvc.perform(get("/plants").param("location", greenhouse))
      .andExpect(jsonPath("$.totalElements").value(0))
    mockMvc.perform(get("/plants").param("location", tray))
      .andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `changing the species shows the new species and its care`() {
    val id = createPlant("Bola 1")

    update(id, speciesId = elongata)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.species.id").value(elongata))
      .andExpect(jsonPath("$.species.scientificName").value("Mammillaria elongata"))
      .andExpect(jsonPath("$.species.minHumidity").value(15))
      .andExpect(jsonPath("$.species.maxHumidity").value(40))
  }

  @Test
  fun `changing the species keeps the identity, creation date, tags, readings and analyses`() {
    val id = createPlant("Bola 1")
    mockMvc.perform(
      put("/plants/$id/tags").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("tagIds" to listOf("400001", "400002")))),
    ).andExpect(status().isOk)
    mockMvc.perform(
      post("/plants/$id/care-records").contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "temperature" to 24)),
    ).andExpect(status().isCreated)
    val createdAt = objectMapper.readTree(
      mockMvc.perform(get("/plants/$id")).andReturn().response.contentAsString,
    ).get("createdAt").asText()

    update(id, speciesId = elongata).andExpect(status().isOk)

    mockMvc.perform(get("/plants/$id"))
      .andExpect(jsonPath("$.id").value(id))
      .andExpect(jsonPath("$.createdAt").value(createdAt))
      .andExpect(jsonPath("$.tags[*].name").value(containsInAnyOrder("globular", "pequeno")))
    mockMvc.perform(get("/plants/$id/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].humidity").value(35))
  }

  @Test
  fun `an edit does not touch the tags`() {
    val id = createPlant("Bola 1")
    mockMvc.perform(
      put("/plants/$id/tags").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("tagIds" to listOf("400003")))),
    ).andExpect(status().isOk)

    update(id, nickname = "Bola 2", locationId = tray).andExpect(status().isOk)

    mockMvc.perform(get("/plants/$id"))
      .andExpect(jsonPath("$.tags.length()").value(1))
      .andExpect(jsonPath("$.tags[0].name").value("sin espinas"))
  }

  @Test
  fun `editing twice with the same values succeeds both times and leaves the plant equal`() {
    val id = createPlant("Bola 1")

    update(id, nickname = "Bola 2", locationId = tray, speciesId = elongata).andExpect(status().isOk)
    update(id, nickname = "Bola 2", locationId = tray, speciesId = elongata)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.nickname").value("Bola 2"))
      .andExpect(jsonPath("$.location.id").value(tray))
      .andExpect(jsonPath("$.species.id").value(elongata))
  }

  @Test
  fun `a blank nickname answers 400 and the plant keeps its own`() {
    val id = createPlant("Bola 1")

    update(id, nickname = "   ", locationId = tray)
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    mockMvc.perform(get("/plants/$id"))
      .andExpect(jsonPath("$.nickname").value("Bola 1"))
      .andExpect(jsonPath("$.location.id").value(greenhouse))
  }

  @Test
  fun `editing a nonexistent plant answers 404`() {
    update("999999999")
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  // --- Validación de las referencias al editar ---

  @Test
  fun `a nonexistent species answers 400 naming the species and changes nothing`() {
    val id = createPlant("Bola 1")

    update(id, speciesId = "999999999")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("especie")))

    mockMvc.perform(get("/plants/$id"))
      .andExpect(jsonPath("$.species.id").value(grusonii))
  }

  @Test
  fun `a nonexistent location answers 400 naming the location and changes nothing`() {
    val id = createPlant("Bola 1")

    update(id, locationId = "999999999")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("localización")))

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.location.id").value(greenhouse))
  }

  @Test
  fun `an invalid reference next to a new nickname applies nothing, not even the nickname`() {
    val id = createPlant("Bola 1")

    update(id, nickname = "Bola nueva", speciesId = "999999999").andExpect(status().isBadRequest)

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.nickname").value("Bola 1"))
  }

  @Test
  fun `an identifier with an invalid format answers 400, not 500`() {
    val id = createPlant("Bola 1")

    update(id, locationId = "no-es-un-id")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  @Test
  fun `a nonexistent plant wins over an invalid reference in the body`() {
    update("999999999", speciesId = "999999999").andExpect(status().isNotFound)
  }

  @Test
  fun `the update leaves createdAt as it was`() {
    val id = createPlant("Bola 1")
    flushPersistenceContext()
    val before = jdbcTemplate.queryForMap(
      "SELECT created_at, updated_at FROM plant WHERE id = ?", id.toLong(),
    )

    update(id, nickname = "Bola 2").andExpect(status().isOk)
    flushPersistenceContext()
    val after = jdbcTemplate.queryForMap(
      "SELECT created_at, updated_at FROM plant WHERE id = ?", id.toLong(),
    )

    assertEquals(before["created_at"], after["created_at"])
  }

  private fun update(
    id: String,
    nickname: String = "Bola 1",
    locationId: String = greenhouse,
    speciesId: String = grusonii,
  ): ResultActions =
    mockMvc.perform(
      put("/plants/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to speciesId)),
    )

  private fun createPlant(nickname: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to greenhouse, "speciesId" to grusonii)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.contains
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de `plant-movements`: el lote, el historial y la edición que cambia de sitio. */
class PlantMovementApiTest : AbstractApiIntegrationTest() {

  private val a3 by lazy { location("Bandeja A3", "LOC-A3") }
  private val a4 by lazy { location("Bandeja A4", "LOC-A4") }
  private val b1 by lazy { location("Bandeja B1", "LOC-B1") }

  // ---- el lote ----

  @Test
  fun `a batch moves every plant, with its real origin, the destination and an instant`() {
    val p1 = plant("P1", a3)
    val p2 = plant("P2", a3)
    val p3 = plant("P3", a4)

    move(b1, p1, p2, p3)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.moved").value(3))
      .andExpect(jsonPath("$.unchanged").value(0))

    for (p in listOf(p1, p2, p3)) {
      mockMvc.perform(get("/plants/$p")).andExpect(jsonPath("$.location.id").value(b1))
    }
    mockMvc.perform(get("/plants/$p3/movements"))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].from.id").value(a4))
      .andExpect(jsonPath("$.content[0].from.name").value("Bandeja A4"))
      .andExpect(jsonPath("$.content[0].to.id").value(b1))
      .andExpect(jsonPath("$.content[0].plantId").value(p3))
      .andExpect(jsonPath("$.content[0].plantCode").isNotEmpty)
      .andExpect(jsonPath("$.content[0].movedAt").isNotEmpty)
    assertEquals(3, countMovements())
  }

  @Test
  fun `a plant that is already at the destination is ignored and counted apart`() {
    val here = plant("Aqui", b1)
    val there = plant("Alla", a3)

    move(b1, here, there)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.moved").value(1))
      .andExpect(jsonPath("$.unchanged").value(1))

    assertEquals(1, countMovements())
  }

  @Test
  fun `a batch with a plant that does not exist is a 400 and nothing moves`() {
    val p1 = plant("P1", a3)

    move(b1, p1, "999999999").andExpect(status().isBadRequest).andExpect(jsonPath("$.status").value(400))

    mockMvc.perform(get("/plants/$p1")).andExpect(jsonPath("$.location.id").value(a3))
    assertEquals(0, countMovements())
  }

  @Test
  fun `an empty batch or one with repeated plants is a 400`() {
    val p1 = plant("P1", a3)

    move(b1).andExpect(status().isBadRequest)
    move(b1, p1, p1).andExpect(status().isBadRequest)
    assertEquals(0, countMovements())
    mockMvc.perform(get("/plants/$p1")).andExpect(jsonPath("$.location.id").value(a3))
  }

  @Test
  fun `a batch of more than 2000 plants is a 400`() {
    val ids = (1..2001).map { (900_000_000L + it).toString() }

    mockMvc.perform(
      post("/locations/$b1/movements").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("plantIds" to ids))),
    ).andExpect(status().isBadRequest)
  }

  @Test
  fun `moving to a destination that does not exist is a 404`() {
    val p1 = plant("P1", a3)

    move("999999999", p1).andExpect(status().isNotFound).andExpect(jsonPath("$.status").value(404))
    assertEquals(0, countMovements())
  }

  // ---- el historial ----

  @Test
  fun `the history of a plant is chained and goes from the most recent to the oldest`() {
    val p1 = plant("P1", a3)
    move(a4, p1).andExpect(status().isOk)
    move(b1, p1).andExpect(status().isOk)

    mockMvc.perform(get("/plants/$p1/movements"))
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[0].from.id").value(a4))
      .andExpect(jsonPath("$.content[0].to.id").value(b1))
      .andExpect(jsonPath("$.content[1].from.id").value(a3))
      .andExpect(jsonPath("$.content[1].to.id").value(a4))
  }

  @Test
  fun `the history of a location has what it received and what it gave away, not its descendants`() {
    val child = location("Hija de A3", "LOC-A3-H", parent = a3)
    val p1 = plant("P1", a3)
    val p2 = plant("P2", a4)
    val p3 = plant("P3", child)
    move(a3, p2).andExpect(status().isOk) // A3 recibe
    move(b1, p1).andExpect(status().isOk) // A3 cede
    move(a4, p3).andExpect(status().isOk) // movimiento de una descendiente, no de A3

    mockMvc.perform(get("/locations/$a3/movements"))
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].plantId").value(contains(p1, p2)))
  }

  @Test
  fun `a plant that never moved has an empty history`() {
    val p1 = plant("P1", a3)

    mockMvc.perform(get("/plants/$p1/movements"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(0))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the history of a plant or a location that does not exist is a 404`() {
    mockMvc.perform(get("/plants/999999999/movements")).andExpect(status().isNotFound)
    mockMvc.perform(get("/locations/999999999/movements")).andExpect(status().isNotFound)
  }

  @Test
  fun `the histories are paginated`() {
    val ids = (1..5).map { plant("P$it", a3) }
    ids.forEach { move(b1, it).andExpect(status().isOk) }

    mockMvc.perform(get("/locations/$b1/movements").param("size", "2"))
      .andExpect(jsonPath("$.content.length()").value(2))
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
  }

  // ---- la edición de un ejemplar ----

  @Test
  fun `editing a plant with another location records a movement`() {
    val p1 = plant("P1", a3)

    edit(p1, "P1", b1).andExpect(status().isOk).andExpect(jsonPath("$.location.id").value(b1))

    mockMvc.perform(get("/plants/$p1/movements"))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].from.id").value(a3))
      .andExpect(jsonPath("$.content[0].to.id").value(b1))
  }

  @Test
  fun `editing only the nickname records no movement`() {
    val p1 = plant("P1", a3)

    edit(p1, "Otro apodo", a3).andExpect(status().isOk)
    edit(p1, "Otro apodo", a3).andExpect(status().isOk)

    assertEquals(0, countMovements())
  }

  @Test
  fun `a rejected edit leaves neither the change nor the movement`() {
    val p1 = plant("P1", a3)

    mockMvc.perform(
      put("/plants/$p1").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "P1", "locationId" to b1, "speciesId" to "999999999")),
    ).andExpect(status().isBadRequest)

    mockMvc.perform(get("/plants/$p1")).andExpect(jsonPath("$.location.id").value(a3))
    assertEquals(0, countMovements())
  }

  @Test
  fun `creating a plant is not a movement`() {
    val p1 = plant("P1", a3)

    mockMvc.perform(get("/plants/$p1/movements")).andExpect(jsonPath("$.totalElements").value(0))
    assertEquals(0, countMovements())
  }

  // ---- ayudas ----

  private fun location(name: String, code: String, parent: String? = null): String {
    val body = if (parent == null) json("name" to name, "code" to code) else json("name" to name, "code" to code, "parentId" to parent)
    val response = mockMvc.perform(post("/locations").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun plant(nickname: String, locationId: String): String {
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to "200001")),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun move(destination: String, vararg plantIds: String): ResultActions =
    mockMvc.perform(
      post("/locations/$destination/movements").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("plantIds" to plantIds.toList()))),
    )

  private fun edit(plantId: String, nickname: String, locationId: String): ResultActions =
    mockMvc.perform(
      put("/plants/$plantId").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to "200001")),
    )

  private fun countMovements(): Int {
    flushPersistenceContext() // el servicio no ha confirmado: lo pendiente de la sesión aún no está en la base
    return jdbcTemplate.queryForObject("SELECT count(*) FROM plant_movement", Int::class.java) ?: 0
  }
}

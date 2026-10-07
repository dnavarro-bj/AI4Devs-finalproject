package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.http.MediaType
import kotlin.test.assertEquals

/** Escenarios de «Alcance de una tarea»: las plantas que afectaría ahora. */
class TaskScopeApiTest : AbstractTaskApiTest() {

  private val invernadero by lazy { createLocation("Invernadero 2") }
  private val bandeja by lazy { createLocation("Bandeja A3", invernadero) }

  @Test
  fun `a location target brings the plants of the location and its sublocations`() {
    val id = newTask("locationId" to invernadero)
    repeat(2) { createPlantIn(invernadero) }
    repeat(4) { createPlantIn(bandeja) }
    createPlantIn("300002")

    scope(id)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(6))
      .andExpect(jsonPath("$.content.length()").value(6))
  }

  @Test
  fun `each plant carries its code, nickname, species and location path`() {
    val id = newTask("locationId" to invernadero)
    createPlantIn(bandeja, nickname = "Bola")

    scope(id)
      .andExpect(jsonPath("$.content[0].id").isString)
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS-01"))
      .andExpect(jsonPath("$.content[0].nickname").value("Bola"))
      .andExpect(jsonPath("$.content[0].species.scientificName").value("Echinocactus grusonii"))
      .andExpect(jsonPath("$.content[0].location.name").value("Bandeja A3"))
      .andExpect(jsonPath("$.content[0].location.path").value("Invernadero 2 / Bandeja A3"))
  }

  @Test
  fun `the scope is ordered by code`() {
    val id = newTask("locationId" to invernadero)
    createPlantIn(invernadero, "200002")
    createPlantIn(invernadero, "200001")

    assertEquals(
      listOf("CAT-GRUSS-01", "CAT-MAMMI-01"),
      readTree(scope(id)).get("content").map { it.get("code").asText() },
    )
  }

  @Test
  fun `a plant that moved away no longer figures and one that arrived does`() {
    val id = newTask("locationId" to invernadero)
    val leaves = createPlantIn(invernadero)
    createPlantIn(invernadero)
    val arrives = createPlantIn("300002")
    val anotherSite = createLocation("Alfeizar 2")
    mockMvc.perform(
      post("/locations/$anotherSite/movements").contentType(MediaType.APPLICATION_JSON).content(json("plantIds" to listOf(leaves))),
    ).andExpect(status().isOk)
    mockMvc.perform(
      post("/locations/$bandeja/movements").contentType(MediaType.APPLICATION_JSON).content(json("plantIds" to listOf(arrives))),
    ).andExpect(status().isOk)

    val ids = readTree(scope(id)).get("content").map { it.get("id").asText() }

    assertEquals(false, leaves in ids)
    assertEquals(true, arrives in ids)
    assertEquals(2, ids.size)
  }

  @Test
  fun `archived plants do not count`() {
    val a = createPlantIn("300001")
    val b = createPlantIn("300001")
    val id = newTask("locationId" to null, "plantIds" to listOf(a, b))
    send("PUT", "/plants/$b/status", json("status" to "muerta")).andExpect(status().isOk)

    scope(id).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(a))
  }

  @Test
  fun `a plants target brings those plants`() {
    val a = createPlantIn("300001")
    createPlantIn("300001")
    val id = newTask("locationId" to null, "plantIds" to listOf(a))

    scope(id).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(a))
  }

  @Test
  fun `the scope is paginated`() {
    val id = newTask("locationId" to invernadero)
    repeat(5) { createPlantIn(invernadero) }

    scope(id, "size" to "2", "page" to "1")
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
      .andExpect(jsonPath("$.content.length()").value(2))
  }

  @Test
  fun `a task that does not exist is a 404`() {
    scope("999999999").andExpect(status().isNotFound)
  }
}

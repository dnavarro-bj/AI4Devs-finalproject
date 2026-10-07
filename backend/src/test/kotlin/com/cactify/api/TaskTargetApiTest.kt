package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Destino de una tarea». */
class TaskTargetApiTest : AbstractTaskApiTest() {

  @Test
  fun `a location target stores no plants and describes the location`() {
    val invernadero = createLocation("Invernadero 2")
    val bandeja = createLocation("Bandeja A3", invernadero)

    createTask("locationId" to bandeja)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.target.kind").value("location"))
      .andExpect(jsonPath("$.target.location.id").value(bandeja))
      .andExpect(jsonPath("$.target.location.name").value("Bandeja A3"))
      .andExpect(jsonPath("$.target.location.path").value("Invernadero 2 / Bandeja A3"))
      .andExpect(jsonPath("$.target.plants").doesNotExist())
  }

  @Test
  fun `a plants target lists them with code and nickname in the detail`() {
    val a = createPlantIn("300001", nickname = "Primera")
    val b = createPlantIn("300001", nickname = "Segunda")
    val c = createPlantIn("300002", nickname = "Tercera")

    val id = newTask("locationId" to null, "plantIds" to listOf(a, b, c))

    task(id)
      .andExpect(jsonPath("$.target.kind").value("plants"))
      .andExpect(jsonPath("$.target.plantCount").value(3))
      .andExpect(jsonPath("$.target.plants.length()").value(3))
      .andExpect(jsonPath("$.target.plants[?(@.nickname=='Primera')].code").isNotEmpty)
      .andExpect(jsonPath("$.target.location").doesNotExist())
  }

  @Test
  fun `both a location and plants are rejected`() {
    val plant = createPlant()

    createTask("plantIds" to listOf(plant)).andExpect(status().isBadRequest)
  }

  @Test
  fun `no destination is rejected`() {
    createTask("locationId" to null).andExpect(status().isBadRequest)
    createTask("locationId" to null, "plantIds" to emptyList<String>()).andExpect(status().isBadRequest)
  }

  @Test
  fun `a location or a plant that does not exist is a 400 and creates nothing`() {
    createTask("locationId" to "999999999").andExpect(status().isBadRequest)
    createTask("locationId" to null, "plantIds" to listOf("999999999")).andExpect(status().isBadRequest)
    createTask("locationId" to null, "plantIds" to listOf(createPlant(), "999999999")).andExpect(status().isBadRequest)

    tasks("status" to "pendiente").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a malformed identifier is a 400`() {
    createTask("locationId" to "abc").andExpect(status().isBadRequest)
    createTask("locationId" to null, "plantIds" to listOf("abc")).andExpect(status().isBadRequest)
  }

  @Test
  fun `an archived plant is rejected`() {
    val plant = createPlant()
    send("PUT", "/plants/$plant/status", json("status" to "muerta")).andExpect(status().isOk)

    createTask("locationId" to null, "plantIds" to listOf(plant)).andExpect(status().isBadRequest)
  }

  @Test
  fun `more than 500 plants are rejected`() {
    val ids = (1..501).map { "10000000$it" }

    createTask("locationId" to null, "plantIds" to ids).andExpect(status().isBadRequest)
  }

  @Test
  fun `a repeated plant counts once`() {
    val plant = createPlant()

    val id = newTask("locationId" to null, "plantIds" to listOf(plant, plant))

    task(id).andExpect(jsonPath("$.target.plantCount").value(1))
  }
}

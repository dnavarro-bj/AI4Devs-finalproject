package com.cactify.api

import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.assertEquals

/** Escenarios de «Completar una tarea». */
class TaskCompletionApiTest : AbstractTaskApiTest() {

  private val invernadero by lazy { createLocation("Invernadero 2") }

  private fun taskTypes(plant: String) =
    readTree(timeline(plant, "type" to "tarea")).get("content").map { it.get("type").asText() }

  @Test
  fun `completing a task of one plant leaves an event in its history`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant), "title" to "Regar la bola")

    complete(id)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("completada"))
      .andExpect(jsonPath("$.completion.affectedPlants").value(1))

    timeline(plant)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].type").value("tarea"))
      .andExpect(jsonPath("$.content[0].task.taskId").value(id))
      .andExpect(jsonPath("$.content[0].task.title").value("Regar la bola"))
      .andExpect(jsonPath("$.content[0].task.type").value("riego"))
  }

  @Test
  fun `a group task with exclusions leaves its event in the included plants and in none of the excluded`() {
    val plants = (1..6).map { createPlantIn(invernadero, nickname = "P$it") }
    val id = newTask("locationId" to invernadero)

    complete(id, "excludedPlantIds" to plants.take(2))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.completion.affectedPlants").value(4))

    plants.take(2).forEach { assertEquals(emptyList(), taskTypes(it)) }
    plants.drop(2).forEach { assertEquals(listOf("tarea"), taskTypes(it)) }
  }

  @Test
  fun `a plant that arrived after the task was created gets its event`() {
    val id = newTask("locationId" to invernadero)
    val arrived = createPlantIn(invernadero)

    complete(id).andExpect(status().isOk).andExpect(jsonPath("$.completion.affectedPlants").value(1))

    assertEquals(listOf("tarea"), taskTypes(arrived))
  }

  @Test
  fun `the sublocations are part of the scope`() {
    val bandeja = createLocation("Bandeja A3", invernadero)
    val deep = createPlantIn(bandeja)
    val id = newTask("locationId" to invernadero)

    complete(id).andExpect(jsonPath("$.completion.affectedPlants").value(1))

    assertEquals(listOf("tarea"), taskTypes(deep))
  }

  @Test
  fun `the event takes the completion instant`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))
    val at = Instant.now().minus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS)

    complete(id, "completedAt" to at.toString())
      .andExpect(jsonPath("$.completion.completedAt").value(at.toString()))

    timeline(plant).andExpect(jsonPath("$.content[0].occurredAt").value(at.toString()))
  }

  @Test
  fun `an exclusion outside the scope is rejected and nothing is written`() {
    val inside = createPlantIn(invernadero)
    val outside = createPlantIn("300002")
    val id = newTask("locationId" to invernadero)

    complete(id, "excludedPlantIds" to listOf(outside)).andExpect(status().isBadRequest)

    assertEquals(emptyList(), taskTypes(inside))
    task(id).andExpect(jsonPath("$.status").value("pendiente"))
  }

  @Test
  fun `excluding every plant is rejected and the task stays pending`() {
    val a = createPlantIn(invernadero)
    val b = createPlantIn(invernadero)
    val id = newTask("locationId" to invernadero)

    complete(id, "excludedPlantIds" to listOf(a, b)).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.status").value("pendiente"))
  }

  @Test
  fun `a task whose scope is empty cannot be completed`() {
    val id = newTask("locationId" to invernadero)

    complete(id).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.status").value("pendiente"))
  }

  @Test
  fun `a task that is not pending answers 409 and writes nothing`() {
    val plant = createPlant()
    val completed = newTask("locationId" to null, "plantIds" to listOf(plant))
    complete(completed).andExpect(status().isOk)
    val skipped = newTask("locationId" to null, "plantIds" to listOf(plant), "title" to "Omitida")
    send("POST", "/tasks/$skipped/skip", json()).andExpect(status().isOk)
    val cancelled = newTask("locationId" to null, "plantIds" to listOf(plant), "title" to "Cancelada")
    send("POST", "/tasks/$cancelled/cancel", json()).andExpect(status().isOk)

    listOf(completed, skipped, cancelled).forEach { complete(it).andExpect(status().isConflict) }

    assertEquals(listOf("tarea"), taskTypes(plant))
  }

  @Test
  fun `a future completion date is rejected`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    complete(id, "completedAt" to Instant.now().plus(2, ChronoUnit.DAYS).toString()).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.status").value("pendiente"))
  }

  @Test
  fun `a task that does not exist is a 404`() {
    complete("999999999").andExpect(status().isNotFound)
  }

  @Test
  fun `the completion does not touch the plants nor the batch`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))
    complete(id).andExpect(status().isOk)

    timeline(plant).andExpect(jsonPath("$.content[0].batchId").doesNotExist())
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/plants/$plant"))
      .andExpect(jsonPath("$.status").value("activa"))
  }

  @Test
  fun `a completed task leaves the default listing and appears among the completed`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))
    complete(id).andExpect(status().isOk)

    tasks().andExpect(jsonPath("$.content[*].id", not(hasItem(id))))
    tasks("status" to "completada").andExpect(jsonPath("$.content[0].id").value(id))
  }
}

package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Cronología unificada del ejemplar» con el tipo `tarea` y «Una tarea completada aparece…». */
class PlantTimelineTaskApiTest : AbstractTaskApiTest() {

  private fun completedTask(plant: String, title: String = "Regar"): String {
    val id = newTask("locationId" to null, "plantIds" to listOf(plant), "title" to title)
    complete(id).andExpect(status().isOk)
    return id
  }

  @Test
  fun `the seven types come together and newest first`() {
    val plant = createPlant()
    send("POST", "/plants/$plant/care-records", json("humidity" to 30, "recordedAt" to daysAgo(60).toString()))
    send("PUT", "/plants/$plant/status", json("status" to "cuarentena")).andExpect(status().isOk)
    send("PUT", "/plants/$plant", json("nickname" to "Bola", "locationId" to "300002", "speciesId" to "200001")).andExpect(status().isOk)
    addComment(plant, "Nota", daysAgo(40))
    addIntervention(plant, "poda", "occurredAt" to daysAgo(30).toString())
    addBloom(plant, "en_flor", dateDaysAgo(20))
    completedTask(plant)

    timeline(plant)
      .andExpect(jsonPath("$.totalElements").value(7))
      .andExpect(jsonPath("$.content[*].type").value(org.hamcrest.Matchers.hasItem("tarea")))
  }

  @Test
  fun `the task entry carries its own detail and no other`() {
    val plant = createPlant()
    val id = completedTask(plant, "Revisar raíces")

    timeline(plant)
      .andExpect(jsonPath("$.content[0].task.taskId").value(id))
      .andExpect(jsonPath("$.content[0].task.title").value("Revisar raíces"))
      .andExpect(jsonPath("$.content[0].task.type").value("riego"))
      .andExpect(jsonPath("$.content[0].comment").doesNotExist())
      .andExpect(jsonPath("$.content[0].reading").doesNotExist())
      .andExpect(jsonPath("$.content[0].intervention").doesNotExist())
  }

  @Test
  fun `the filter by type brings only task events`() {
    val plant = createPlant()
    addComment(plant)
    completedTask(plant)
    completedTask(plant, "Otra")

    timeline(plant, "type" to "tarea")
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].type").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.`is`("tarea"))))
  }

  @Test
  fun `a skipped or cancelled task leaves no trace`() {
    val plant = createPlant()
    val skipped = newTask("locationId" to null, "plantIds" to listOf(plant))
    val cancelled = newTask("locationId" to null, "plantIds" to listOf(plant), "title" to "Otra")
    send("POST", "/tasks/$skipped/skip", json()).andExpect(status().isOk)
    send("POST", "/tasks/$cancelled/cancel", json()).andExpect(status().isOk)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a task event cannot be edited or removed through the other resources`() {
    val plant = createPlant()
    completedTask(plant)
    val event = readTree(timeline(plant)).get("content").get(0).get("id").asText()

    send("PUT", "/plants/$plant/comments/$event", json("text" to "x")).andExpect(status().isNotFound)
    send("DELETE", "/plants/$plant/comments/$event").andExpect(status().isNotFound)
    send("DELETE", "/plants/$plant/interventions/$event").andExpect(status().isNotFound)
    send("DELETE", "/plants/$plant/blooms/$event").andExpect(status().isNotFound)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the events of another plant do not appear`() {
    val a = createPlant()
    val b = createPlant()
    completedTask(a)

    assertEquals(0, readTree(timeline(b)).get("totalElements").asInt())
  }

  @Test
  fun `the order is stable between pages`() {
    val plant = createPlant()
    repeat(5) { completedTask(plant, "Tarea $it") }

    val seen = (0..2).flatMap { page ->
      readTree(timeline(plant, "size" to "2", "page" to page.toString())).get("content").map { it.get("id").asText() }
    }

    assertEquals(5, seen.toSet().size)
  }
}

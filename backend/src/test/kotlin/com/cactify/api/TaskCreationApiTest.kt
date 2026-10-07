package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Alta de una tarea». */
class TaskCreationApiTest : AbstractTaskApiTest() {

  @Test
  fun `a one day task is created pending and manual`() {
    createTask()
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.status").value("pendiente"))
      .andExpect(jsonPath("$.origin").value("manual"))
      .andExpect(jsonPath("$.type").value("riego"))
      .andExpect(jsonPath("$.dueFrom").value("2026-10-15"))
      .andExpect(jsonPath("$.dueTo").value("2026-10-15"))
      .andExpect(jsonPath("$.priority").value("normal"))
      .andExpect(jsonPath("$.id").isString)
  }

  @Test
  fun `a task with a period keeps both dates`() {
    createTask("dueFrom" to "2026-10-12", "dueTo" to "2026-10-18")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.dueFrom").value("2026-10-12"))
      .andExpect(jsonPath("$.dueTo").value("2026-10-18"))
  }

  @Test
  fun `the priority and the notes are kept`() {
    createTask("priority" to "alta", "notes" to "  Con la manguera  ")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.priority").value("alta"))
      .andExpect(jsonPath("$.notes").value("Con la manguera"))
  }

  @Test
  fun `an inverted period is rejected and nothing is created`() {
    createTask("dueFrom" to "2026-10-15", "dueTo" to "2026-10-14").andExpect(status().isBadRequest)

    tasks("status" to "pendiente").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a blank title is rejected`() {
    createTask("title" to "   ").andExpect(status().isBadRequest)
  }

  @Test
  fun `a missing title or date is rejected`() {
    createTask("title" to null).andExpect(status().isBadRequest)
    createTask("dueFrom" to null).andExpect(status().isBadRequest)
  }

  @Test
  fun `a past date is accepted and the task is born overdue`() {
    val id = newTask("dueFrom" to "2026-10-01")

    assertEquals(listOf(id), idsOf(tasks("due" to "overdue", "today" to today)))
  }

  @Test
  fun `creating a task writes nothing in the history or the readings of a plant`() {
    val plant = createPlant()

    createTask("locationId" to null, "plantIds" to listOf(plant)).andExpect(status().isCreated)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/plants/$plant/care-records"))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `an unknown type or priority is rejected`() {
    createTask("type" to "fumigar").andExpect(status().isBadRequest)
    createTask("priority" to "urgente").andExpect(status().isBadRequest)
  }
}

package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Consulta de una tarea». */
class TaskDetailApiTest : AbstractTaskApiTest() {

  @Test
  fun `a pending task carries its data and no completion`() {
    val id = newTask("notes" to "Mañana", "priority" to "alta")

    task(id)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(id))
      .andExpect(jsonPath("$.title").value("Regar"))
      .andExpect(jsonPath("$.priority").value("alta"))
      .andExpect(jsonPath("$.notes").value("Mañana"))
      .andExpect(jsonPath("$.status").value("pendiente"))
      .andExpect(jsonPath("$.completion").doesNotExist())
      .andExpect(jsonPath("$.closedReason").doesNotExist())
      .andExpect(jsonPath("$.createdAt").exists())
  }

  @Test
  fun `a completed task carries its completion`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))
    complete(id).andExpect(status().isOk)

    task(id)
      .andExpect(jsonPath("$.status").value("completada"))
      .andExpect(jsonPath("$.completion.affectedPlants").value(1))
      .andExpect(jsonPath("$.completion.completedAt").exists())
  }

  @Test
  fun `a skipped task carries its reason`() {
    val id = newTask()
    send("POST", "/tasks/$id/skip", json("reason" to "lluvia")).andExpect(status().isOk)

    task(id).andExpect(jsonPath("$.status").value("omitida")).andExpect(jsonPath("$.closedReason").value("lluvia"))
  }

  @Test
  fun `a task that does not exist is a 404`() {
    task("999999999").andExpect(status().isNotFound)
    task("abc").andExpect(status().isBadRequest)
  }
}

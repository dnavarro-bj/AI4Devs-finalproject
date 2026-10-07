package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Editar y reprogramar una tarea pendiente». */
class TaskUpdateApiTest : AbstractTaskApiTest() {

  @Test
  fun `rescheduling changes only the period`() {
    val id = newTask("priority" to "alta", "notes" to "Nota")

    send("PUT", "/tasks/$id/schedule", json("dueFrom" to "2026-10-20", "dueTo" to "2026-10-22"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.dueFrom").value("2026-10-20"))
      .andExpect(jsonPath("$.dueTo").value("2026-10-22"))
      .andExpect(jsonPath("$.priority").value("alta"))
      .andExpect(jsonPath("$.notes").value("Nota"))
      .andExpect(jsonPath("$.title").value("Regar"))
  }

  @Test
  fun `rescheduling to a single day keeps both dates equal`() {
    val id = newTask("dueFrom" to "2026-10-12", "dueTo" to "2026-10-18")

    send("PUT", "/tasks/$id/schedule", json("dueFrom" to "2026-10-20"))
      .andExpect(jsonPath("$.dueTo").value("2026-10-20"))
  }

  @Test
  fun `a replacement changes everything, including the target`() {
    val plant = createPlant()
    val id = newTask()

    send("PUT", "/tasks/$id", taskBody("type" to "poda_raices", "title" to "Podar raíces", "locationId" to null, "plantIds" to listOf(plant)))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.type").value("poda_raices"))
      .andExpect(jsonPath("$.title").value("Podar raíces"))
      .andExpect(jsonPath("$.target.kind").value("plants"))
      .andExpect(jsonPath("$.target.plantCount").value(1))
  }

  @Test
  fun `moving a plants task to a location leaves it without plants`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    send("PUT", "/tasks/$id", taskBody("locationId" to "300002"))
      .andExpect(jsonPath("$.target.kind").value("location"))

    task(id).andExpect(jsonPath("$.target.plants").doesNotExist())
  }

  @Test
  fun `a closed task is not edited or rescheduled`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))
    complete(id).andExpect(status().isOk)

    send("PUT", "/tasks/$id", taskBody("title" to "Otro")).andExpect(status().isConflict)
    send("PUT", "/tasks/$id/schedule", json("dueFrom" to "2026-11-01")).andExpect(status().isConflict)

    task(id).andExpect(jsonPath("$.title").value("Regar")).andExpect(jsonPath("$.dueFrom").value("2026-10-15"))
  }

  @Test
  fun `an invalid replacement changes nothing`() {
    val id = newTask()

    send("PUT", "/tasks/$id", taskBody("title" to "  ")).andExpect(status().isBadRequest)
    send("PUT", "/tasks/$id", taskBody("locationId" to "999999999")).andExpect(status().isBadRequest)
    send("PUT", "/tasks/$id/schedule", json("dueFrom" to "2026-10-20", "dueTo" to "2026-10-19")).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.title").value("Regar")).andExpect(jsonPath("$.dueFrom").value("2026-10-15"))
  }

  @Test
  fun `a task that does not exist is a 404`() {
    send("PUT", "/tasks/999999999", taskBody()).andExpect(status().isNotFound)
    send("PUT", "/tasks/999999999/schedule", json("dueFrom" to "2026-10-20")).andExpect(status().isNotFound)
  }
}

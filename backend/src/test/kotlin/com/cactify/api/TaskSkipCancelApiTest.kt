package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Omitir y cancelar una tarea»: conservan la planificación y no dejan rastro en las plantas. */
class TaskSkipCancelApiTest : AbstractTaskApiTest() {

  @Test
  fun `skipping with a reason keeps it and writes nothing in the plants`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    send("POST", "/tasks/$id/skip", json("reason" to "lluvia"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("omitida"))
      .andExpect(jsonPath("$.closedReason").value("lluvia"))

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `cancelling without a reason is accepted and stays consultable`() {
    val id = newTask()

    send("POST", "/tasks/$id/cancel", json())
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("cancelada"))
      .andExpect(jsonPath("$.closedReason").doesNotExist())

    task(id).andExpect(status().isOk).andExpect(jsonPath("$.status").value("cancelada"))
  }

  @Test
  fun `a body is not required`() {
    val id = newTask()

    send("POST", "/tasks/$id/cancel").andExpect(status().isOk)
  }

  @Test
  fun `a task that is already closed answers 409 and does not change`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))
    complete(id).andExpect(status().isOk)

    send("POST", "/tasks/$id/cancel", json()).andExpect(status().isConflict)
    send("POST", "/tasks/$id/skip", json("reason" to "x")).andExpect(status().isConflict)

    task(id).andExpect(jsonPath("$.status").value("completada"))
  }

  @Test
  fun `skipping a watering does not count as a care`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant), "type" to "riego")

    send("POST", "/tasks/$id/skip", json("reason" to "lluvia")).andExpect(status().isOk)

    mockMvc.perform(get("/plants/$plant/care-records")).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a reason over 500 characters is rejected and the task stays pending`() {
    val id = newTask()

    send("POST", "/tasks/$id/skip", json("reason" to "x".repeat(501))).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.status").value("pendiente"))
  }

  @Test
  fun `a task that does not exist is a 404`() {
    send("POST", "/tasks/999999999/skip", json()).andExpect(status().isNotFound)
    send("POST", "/tasks/999999999/cancel", json()).andExpect(status().isNotFound)
  }
}

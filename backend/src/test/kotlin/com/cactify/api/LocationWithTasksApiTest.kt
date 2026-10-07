package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Una localización con tareas no se retira». */
class LocationWithTasksApiTest : AbstractTaskApiTest() {

  @Test
  fun `a location with a pending task cannot be removed`() {
    val location = createLocation("Con tarea pendiente")
    newTask("locationId" to location)

    mockMvc.perform(delete("/locations/$location"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("tareas")))

    mockMvc.perform(get("/locations/$location")).andExpect(status().isOk)
  }

  @Test
  fun `a location with only a completed task cannot be removed either`() {
    val location = createLocation("Con tarea completada")
    val plant = createPlantIn(location)
    val id = newTask("locationId" to location)
    complete(id).andExpect(status().isOk)
    send("PUT", "/plants/$plant/status", json("status" to "muerta")).andExpect(status().isOk)
    clearPlantsOf(plant)

    mockMvc.perform(delete("/locations/$location")).andExpect(status().isConflict)
  }

  @Test
  fun `a location nobody points to is removed`() {
    val location = createLocation("Sin tareas")

    mockMvc.perform(delete("/locations/$location")).andExpect(status().isNoContent)
  }

  /** Quita la planta y lo que cuelga de ella para que solo quede la referencia de la tarea. */
  private fun clearPlantsOf(plant: String) {
    flushPersistenceContext()
    jdbcTemplate.update("DELETE FROM plant_event WHERE plant_id = ?", plant.toLong())
    jdbcTemplate.update("DELETE FROM plant_movement WHERE plant_id = ?", plant.toLong())
    jdbcTemplate.update("DELETE FROM plant_status_change WHERE plant_id = ?", plant.toLong())
    jdbcTemplate.update("DELETE FROM plant WHERE id = ?", plant.toLong())
  }
}

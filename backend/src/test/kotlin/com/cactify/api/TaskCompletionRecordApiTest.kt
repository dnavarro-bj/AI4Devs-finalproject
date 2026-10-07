package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Completar puede registrar el hecho concreto». */
class TaskCompletionRecordApiTest : AbstractTaskApiTest() {

  private val invernadero by lazy { createLocation("Invernadero 2") }

  @Test
  fun `a watering with water delivered leaves a reading linked to the task in every included plant`() {
    val plants = (1..3).map { createPlantIn(invernadero) }
    val id = newTask("locationId" to invernadero)

    complete(id, "reading" to mapOf("waterAmountMl" to 200)).andExpect(status().isOk)

    plants.forEach { plant ->
      mockMvc.perform(get("/plants/$plant/care-records"))
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].waterAmountMl").value(200))
        .andExpect(jsonPath("$.content[0].taskId").value(id))
      timeline(plant).andExpect(jsonPath("$.totalElements").value(2))
    }
  }

  @Test
  fun `a repotting leaves a transplant linked to the task`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant), "type" to "cambio_maceta")

    complete(id, "intervention" to mapOf("type" to "trasplante", "potSize" to "12 cm")).andExpect(status().isOk)

    timeline(plant, "type" to "intervencion")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].intervention.type").value("trasplante"))
      .andExpect(jsonPath("$.content[0].intervention.potSize").value("12 cm"))
      .andExpect(jsonPath("$.content[0].intervention.taskId").value(id))
  }

  @Test
  fun `completing without a record writes only the task event`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant), "type" to "proteccion_frio")

    complete(id).andExpect(status().isOk)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].type").value("tarea"))
    mockMvc.perform(get("/plants/$plant/care-records")).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a reading with no measure is rejected and the task stays pending`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    complete(id, "reading" to emptyMap<String, Any>()).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.status").value("pendiente"))
    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a datum alien to the intervention type is rejected and the task stays pending`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant), "type" to "poda_raices")

    complete(id, "intervention" to mapOf("type" to "poda", "potSize" to "12 cm")).andExpect(status().isBadRequest)

    task(id).andExpect(jsonPath("$.status").value("pendiente"))
    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a mix that does not exist is a 400`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    complete(id, "intervention" to mapOf("type" to "sustrato", "soilMixId" to "999999999")).andExpect(status().isBadRequest)
  }

  @Test
  fun `a reading and an intervention can come together`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    complete(
      id,
      "reading" to mapOf("waterAmountMl" to 150),
      "intervention" to mapOf("type" to "revision", "notes" to "Todo bien"),
    ).andExpect(status().isOk)

    assertEquals(3, readTree(timeline(plant)).get("totalElements").asInt())
  }

  @Test
  fun `the direct creation of a reading or an intervention ignores a task id`() {
    val plant = createPlant()
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    send("POST", "/plants/$plant/care-records", json("humidity" to 30, "taskId" to id)).andExpect(status().isCreated)
      .andExpect(jsonPath("$.taskId").doesNotExist())
    addIntervention(plant, "poda", "taskId" to id).andExpect(status().isCreated)
      .andExpect(jsonPath("$.intervention.taskId").doesNotExist())
  }

  @Test
  fun `a reading registered directly has no task id`() {
    val plant = createPlant()

    send("POST", "/plants/$plant/care-records", json("humidity" to 30)).andExpect(status().isCreated)
      .andExpect(jsonPath("$.taskId").doesNotExist())
    mockMvc.perform(get("/plants/$plant/care-records")).andExpect(jsonPath("$.content[0].taskId").doesNotExist())
  }
}

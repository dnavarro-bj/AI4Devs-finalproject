package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/**
 * Una lectura fuera de rango abre su alerta **venga de donde venga**: del alta individual, de un lote o
 * de completar una tarea. Si no, la misma temperatura peligrosa avisaría o no según por dónde se escribió.
 */
class RecordsFromOperationsAlertApiTest : AbstractBatchApiTest() {

  private fun alertCount(plant: String): Long {
    flushPersistenceContext()
    return jdbcTemplate.queryForObject("SELECT count(*) FROM alert WHERE plant_id = ?", Long::class.java, plant.toLong())!!
  }

  @Test
  fun `a batch reading out of range opens an alert on every plant included`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "reading" to mapOf("temperature" to 2)).andExpect(status().isCreated)

    plants.forEach { assertEquals(1, alertCount(it), "una alerta por planta incluida") }
  }

  @Test
  fun `a batch reading inside the range opens nothing`() {
    val plants = (1..2).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "reading" to mapOf("temperature" to 22, "humidity" to 20)).andExpect(status().isCreated)

    plants.forEach { assertEquals(0, alertCount(it)) }
  }

  @Test
  fun `excluded plants of a batch get no alert`() {
    val plants = (1..2).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "reading" to mapOf("temperature" to 2), "excludedPlantIds" to listOf(plants[0]))
      .andExpect(status().isCreated)

    assertEquals(0, alertCount(plants[0]))
    assertEquals(1, alertCount(plants[1]))
  }

  @Test
  fun `a rejected batch reading leaves no alert`() {
    val plant = createPlantIn(invernadero)

    applyBatch(locationScope(invernadero), "reading" to mapOf("humidity" to 140)).andExpect(status().isBadRequest)

    assertEquals(0, alertCount(plant))
  }

  @Test
  fun `completing a task with an out of range reading opens an alert on every plant included`() {
    val plants = (1..2).map { createPlantIn(invernadero) }
    val task = newTask("locationId" to invernadero)

    complete(task, "reading" to mapOf("temperature" to 2)).andExpect(status().isOk)

    plants.forEach { assertEquals(1, alertCount(it)) }
  }

  @Test
  fun `completing a task with a reading inside the range opens nothing`() {
    val plant = createPlantIn(invernadero)
    val task = newTask("locationId" to invernadero)

    complete(task, "reading" to mapOf("temperature" to 22)).andExpect(status().isOk)

    assertEquals(0, alertCount(plant))
  }
}

package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Tareas pendientes por localización». */
class LocationPendingTasksApiTest : AbstractBatchApiTest() {

  private fun pendingOf(location: String): Int =
    readTree(send("GET", "/locations/$location").andExpect(status().isOk)).get("pendingTasks").asInt()

  private fun pendingInList(location: String): Int {
    val rows = readTree(send("GET", "/locations?size=500")).get("content")
    return rows.first { it.get("id").asText() == location }.get("pendingTasks").asInt()
  }

  private fun expectBoth(location: String, expected: Int) {
    assertEquals(expected, pendingOf(location), "ficha de $location")
    assertEquals(expected, pendingInList(location), "listado de $location")
  }

  @Test
  fun `a task aimed at a location counts for it`() {
    newTask("locationId" to invernadero)

    expectBoth(invernadero, 1)
  }

  @Test
  fun `a task aimed at a tray counts for the tray and for the greenhouse that contains it`() {
    newTask("locationId" to bandeja)

    expectBoth(bandeja, 1)
    expectBoth(invernadero, 1)
  }

  @Test
  fun `a task for three plants in a location counts once, not three times`() {
    val plants = (1..3).map { createPlantIn(invernadero) }
    newTask("locationId" to null, "plantIds" to plants)

    expectBoth(invernadero, 1)
  }

  @Test
  fun `a task whose plants reach the same location by two routes counts once`() {
    val inTray = createPlantIn(bandeja)
    val inGreenhouse = createPlantIn(invernadero)
    newTask("locationId" to null, "plantIds" to listOf(inTray, inGreenhouse))

    expectBoth(invernadero, 1)
    expectBoth(bandeja, 1)
  }

  @Test
  fun `closed tasks do not count`() {
    val done = newTask("locationId" to invernadero)
    val skipped = newTask("locationId" to invernadero)
    val cancelled = newTask("locationId" to invernadero)
    createPlantIn(invernadero)

    complete(done).andExpect(status().isOk)
    send("POST", "/tasks/$skipped/skip", json("reason" to "lluvia")).andExpect(status().isOk)
    send("POST", "/tasks/$cancelled/cancel", json()).andExpect(status().isOk)

    expectBoth(invernadero, 0)
  }

  @Test
  fun `a location with nothing pending has zero`() {
    expectBoth(bandeja, 0)
  }

  @Test
  fun `it matches the total of the task listing for the same location with descendants`() {
    val plant = createPlantIn(bandeja)
    newTask("locationId" to invernadero)
    newTask("locationId" to bandeja)
    newTask("locationId" to null, "plantIds" to listOf(plant))

    for (location in listOf(invernadero, bandeja)) {
      send("GET", "/tasks?location=$location&includeDescendants=true&size=1")
        .andExpect(jsonPath("$.totalElements").value(pendingOf(location)))
    }
    assertEquals(3, pendingOf(invernadero))
  }

  @Test
  fun `the whole listing is resolved without a query per row`() {
    repeat(6) { index -> createLocation("Zona $index") }
    newTask("locationId" to invernadero)

    // Todas las filas traen el campo: es una consulta agregada y no una por fila (el recuento de
    // sentencias lo cubre `LocationPendingTasksQueryCountTest`).
    readTree(send("GET", "/locations?size=500")).get("content").forEach {
      assert(it.has("pendingTasks")) { "falta pendingTasks en ${it.get("name")}" }
    }
  }
}

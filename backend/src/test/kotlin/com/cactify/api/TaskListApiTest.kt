package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Listado de tareas con filtros combinables»: estado, orden y paginación. */
class TaskListApiTest : AbstractTaskApiTest() {

  @Test
  fun `by default only the pending tasks come`() {
    val pending = newTask()
    val skipped = newTask("title" to "Omitida")
    send("POST", "/tasks/$skipped/skip", json()).andExpect(status().isOk)

    assertEquals(listOf(pending), idsOf(tasks()))
  }

  @Test
  fun `several statuses can be asked at once`() {
    newTask()
    val skipped = newTask("title" to "Omitida")
    send("POST", "/tasks/$skipped/skip", json()).andExpect(status().isOk)
    val cancelled = newTask("title" to "Cancelada")
    send("POST", "/tasks/$cancelled/cancel", json()).andExpect(status().isOk)

    assertEquals(
      setOf(skipped, cancelled),
      idsOf(tasks("status" to "omitida", "status" to "cancelada")).toSet(),
    )
  }

  @Test
  fun `the page carries the envelope and a summary of each task`() {
    val id = newTask()

    tasks()
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.content[0].id").value(id))
      .andExpect(jsonPath("$.content[0].target.kind").value("location"))
      .andExpect(jsonPath("$.content[0].target.plants").doesNotExist())
  }

  @Test
  fun `a plants target shows its count in the list and not the plants`() {
    val plant = createPlant()
    newTask("locationId" to null, "plantIds" to listOf(plant))

    tasks()
      .andExpect(jsonPath("$.content[0].target.plantCount").value(1))
      .andExpect(jsonPath("$.content[0].target.plants").doesNotExist())
  }

  @Test
  fun `the default order is by period, soonest end first, with the id as tiebreak`() {
    val late = newTask("dueFrom" to "2026-10-30", "title" to "Tarde")
    val soon = newTask("dueFrom" to "2026-10-10", "title" to "Pronto")
    val wide = newTask("dueFrom" to "2026-10-05", "dueTo" to "2026-10-20", "title" to "Ancha")

    assertEquals(listOf(soon, wide, late), idsOf(tasks()))
  }

  @Test
  fun `the order can be reversed and by title`() {
    val a = newTask("title" to "Alfa", "dueFrom" to "2026-10-20")
    val b = newTask("title" to "Beta", "dueFrom" to "2026-10-10")

    assertEquals(listOf(a, b), idsOf(tasks("sort" to "due,desc")))
    assertEquals(listOf(a, b), idsOf(tasks("sort" to "title,asc")))
    assertEquals(listOf(b, a), idsOf(tasks("sort" to "title,desc")))
  }

  @Test
  fun `the order is stable across pages when many tasks share a period`() {
    val ids = (1..7).map { newTask("title" to "Tarea $it") }

    val seen = (0..2).flatMap { page -> idsOf(tasks("size" to "3", "page" to page.toString(), "sort" to "due,asc")) }

    assertEquals(ids.toSet(), seen.toSet())
    assertEquals(7, seen.size)
  }

  @Test
  fun `an alien sort key is a 400`() {
    tasks("sort" to "notes,asc").andExpect(status().isBadRequest)
    tasks("sort" to "due,sideways").andExpect(status().isBadRequest)
  }

  @Test
  fun `an invalid value is a 400, never a 500`() {
    tasks("type" to "fumigar").andExpect(status().isBadRequest)
    tasks("priority" to "urgente").andExpect(status().isBadRequest)
    tasks("status" to "vencida").andExpect(status().isBadRequest)
    tasks("from" to "ayer").andExpect(status().isBadRequest)
    tasks("location" to "abc").andExpect(status().isBadRequest)
    tasks("plant" to "abc").andExpect(status().isBadRequest)
    tasks("species" to "abc").andExpect(status().isBadRequest)
  }

  @Test
  fun `the page size is bounded by the configured maximum`() {
    mockMvc.perform(get("/tasks").param("size", "100000")).andExpect(jsonPath("$.pageSize").value(500))
  }
}

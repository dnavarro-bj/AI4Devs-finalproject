package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Vencida se calcula»: una comparación contra la fecha que declara el cliente. */
class TaskOverdueApiTest : AbstractTaskApiTest() {

  private fun overdue(today: String = this.today) = idsOf(tasks("due" to "overdue", "today" to today))
  private fun dueToday(today: String = this.today) = idsOf(tasks("due" to "today", "today" to today))

  @Test
  fun `a pending task whose end is past is overdue without anyone marking it`() {
    val yesterday = newTask("dueFrom" to "2026-10-14")

    assertEquals(listOf(yesterday), overdue())
  }

  @Test
  fun `the last day is not overdue and is due today`() {
    val id = newTask("dueFrom" to "2026-10-15")

    assertEquals(emptyList(), overdue())
    assertEquals(listOf(id), dueToday())
  }

  @Test
  fun `a period containing today is due today and not overdue`() {
    val id = newTask("dueFrom" to "2026-10-12", "dueTo" to "2026-10-18")

    assertEquals(listOf(id), dueToday("2026-10-15"))
    assertEquals(emptyList(), overdue("2026-10-15"))
  }

  @Test
  fun `a future task is neither`() {
    newTask("dueFrom" to "2026-10-20")

    assertEquals(emptyList(), overdue())
    assertEquals(emptyList(), dueToday())
  }

  @Test
  fun `a closed task never becomes overdue`() {
    val plant = createPlant()
    val completed = newTask("dueFrom" to "2026-10-01", "locationId" to null, "plantIds" to listOf(plant))
    complete(completed).andExpect(status().isOk)
    val skipped = newTask("dueFrom" to "2026-10-01")
    send("POST", "/tasks/$skipped/skip", json()).andExpect(status().isOk)
    val cancelled = newTask("dueFrom" to "2026-10-01")
    send("POST", "/tasks/$cancelled/cancel", json()).andExpect(status().isOk)

    assertEquals(emptyList(), overdue())
    tasks("due" to "overdue", "today" to today, "status" to "completada", "status" to "omitida", "status" to "cancelada")
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the client declares what day it is`() {
    val id = newTask("dueFrom" to "2026-10-18")

    assertEquals(emptyList(), overdue("2026-10-18"))
    assertEquals(listOf(id), overdue("2026-10-20"))
  }

  @Test
  fun `without today the server uses the date of its clock in UTC`() {
    val longAgo = newTask("dueFrom" to "2020-01-01")
    val farAway = newTask("dueFrom" to "2999-01-01")

    val ids = idsOf(tasks("due" to "overdue"))

    assertEquals(true, longAgo in ids)
    assertEquals(false, farAway in ids)
  }

  @Test
  fun `an invalid date or due value is a 400`() {
    tasks("due" to "overdue", "today" to "ayer").andExpect(status().isBadRequest)
    tasks("due" to "pronto").andExpect(status().isBadRequest)
  }
}

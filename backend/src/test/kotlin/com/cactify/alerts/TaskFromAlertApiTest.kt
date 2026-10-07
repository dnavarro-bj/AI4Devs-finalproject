package com.cactify.alerts

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate
import java.time.ZoneOffset

/** Escenarios de «Una tarea puede nacer de una alerta», «Completar una tarea con alerta de origen propone resolverla» y «El enlace con la alerta no bloquea nada». */
class TaskFromAlertApiTest : AbstractAlertTest() {

  private fun today(): LocalDate = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC)

  private fun createTask(plant: String, vararg extra: Pair<String, Any?>): ResultActions = send(
    "POST", "/tasks",
    json("type" to "otra", "title" to "Revisar", "dueFrom" to today().toString(), "plantIds" to listOf(plant), *extra),
  )

  @Test
  fun `a task created from an alert is linked to it and leaves it untouched`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))

    createTask(plant, "originAlertId" to alert)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.origin").value("alerta"))
      .andExpect(jsonPath("$.originAlertId").value(alert))

    send("GET", "/alerts/$alert").andExpect(jsonPath("$.status").value("nueva"))
  }

  @Test
  fun `several tasks can come from the same alert`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val first = idOf(createTask(plant, "originAlertId" to alert))
    val second = idOf(createTask(plant, "originAlertId" to alert))

    send("GET", "/alerts/$alert")
      .andExpect(jsonPath("$.tasks", hasSize<Any>(2)))
      .andExpect(jsonPath("$.tasks[*].id", org.hamcrest.Matchers.containsInAnyOrder(first, second)))
    send("GET", "/tasks?alert=$alert").andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `filtering tasks by alert leaves out the others`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val other = idOf(manualAlert(plant))
    createTask(plant, "originAlertId" to alert)
    createTask(plant, "originAlertId" to other)
    createTask(plant)

    send("GET", "/tasks?alert=$alert").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `a missing alert answers 400 and creates nothing`() {
    val plant = newPlant()

    createTask(plant, "originAlertId" to "999999999").andExpect(status().isBadRequest)

    send("GET", "/tasks?plant=$plant").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a closed alert answers 409 and creates nothing`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    send("POST", "/alerts/$alert/dismiss").andExpect(status().isOk)

    createTask(plant, "originAlertId" to alert).andExpect(status().isConflict)

    send("GET", "/tasks?plant=$plant").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a task without an alert stays manual`() {
    val plant = newPlant()

    createTask(plant)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.origin").value("manual"))
      .andExpect(jsonPath("$.originAlertId").doesNotExist())
  }

  @Test
  fun `a malformed alert id answers 400`() {
    createTask(newPlant(), "originAlertId" to "abc").andExpect(status().isBadRequest)
  }

  // ---- Completar propone ----

  @Test
  fun `completing the task of an open alert suggests resolving it and does not resolve it`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    send("POST", "/alerts/$alert/review").andExpect(status().isOk)
    val task = idOf(createTask(plant, "originAlertId" to alert))

    send("POST", "/tasks/$task/complete")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("completada"))
      .andExpect(jsonPath("$.suggestedAlertResolution.alertId").value(alert))
      .andExpect(jsonPath("$.suggestedAlertResolution.status").value("revisada"))

    send("GET", "/alerts/$alert").andExpect(jsonPath("$.status").value("revisada"))
  }

  @Test
  fun `no suggestion when the alert was closed meanwhile`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val task = idOf(createTask(plant, "originAlertId" to alert))
    send("POST", "/alerts/$alert/resolve").andExpect(status().isOk)

    send("POST", "/tasks/$task/complete")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.suggestedAlertResolution").doesNotExist())
      .andExpect(jsonPath("$.originAlertId").value(alert))
  }

  @Test
  fun `no suggestion for a manual task`() {
    val plant = newPlant()
    val task = idOf(createTask(plant))

    send("POST", "/tasks/$task/complete").andExpect(status().isOk).andExpect(jsonPath("$.suggestedAlertResolution").doesNotExist())
  }

  @Test
  fun `skipping or cancelling does not suggest anything and the alert is untouched`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val skipped = idOf(createTask(plant, "originAlertId" to alert))
    val cancelled = idOf(createTask(plant, "originAlertId" to alert))

    send("POST", "/tasks/$skipped/skip").andExpect(status().isOk).andExpect(jsonPath("$.suggestedAlertResolution").doesNotExist())
    send("POST", "/tasks/$cancelled/cancel").andExpect(status().isOk).andExpect(jsonPath("$.suggestedAlertResolution").doesNotExist())

    send("GET", "/alerts/$alert").andExpect(jsonPath("$.status").value("nueva"))
  }

  @Test
  fun `the suggestion is only in the completion response`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val task = idOf(createTask(plant, "originAlertId" to alert))
    send("POST", "/tasks/$task/complete").andExpect(status().isOk)

    send("GET", "/tasks/$task").andExpect(jsonPath("$.suggestedAlertResolution").doesNotExist())
  }

  // ---- El enlace no bloquea ----

  @Test
  fun `resolving an alert leaves its pending task pending and linked`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val task = idOf(createTask(plant, "originAlertId" to alert))

    send("POST", "/alerts/$alert/resolve").andExpect(status().isOk)

    send("GET", "/tasks/$task")
      .andExpect(jsonPath("$.status").value("pendiente"))
      .andExpect(jsonPath("$.originAlertId").value(alert))
  }

  @Test
  fun `a task of a closed alert can still be rescheduled`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val task = idOf(createTask(plant, "originAlertId" to alert))
    send("POST", "/alerts/$alert/dismiss").andExpect(status().isOk)

    send("PUT", "/tasks/$task/schedule", json("dueFrom" to today().plusDays(3).toString())).andExpect(status().isOk)
  }

  @Test
  fun `replacing a task keeps its origin alert`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant))
    val task = idOf(createTask(plant, "originAlertId" to alert))

    send(
      "PUT", "/tasks/$task",
      json("type" to "otra", "title" to "Otro título", "dueFrom" to today().toString(), "plantIds" to listOf(plant)),
    ).andExpect(status().isOk).andExpect(jsonPath("$.originAlertId").value(alert)).andExpect(jsonPath("$.origin").value("alerta"))
  }
}

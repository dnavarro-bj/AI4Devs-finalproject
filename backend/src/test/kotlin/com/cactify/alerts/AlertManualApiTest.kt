package com.cactify.alerts

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Alertas manuales» y «La alerta es una incidencia con ciclo de vida». */
class AlertManualApiTest : AbstractAlertTest() {

  @Test
  fun `noting an incident answers 201 with manual origin, new status and the opening in its history`() {
    val plant = newPlant()

    manualAlert(plant, category = "otra", severity = "media", reason = "Cochinilla en la base")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.source").value("manual"))
      .andExpect(jsonPath("$.status").value("nueva"))
      .andExpect(jsonPath("$.category").value("otra"))
      .andExpect(jsonPath("$.severity").value("media"))
      .andExpect(jsonPath("$.reason").value("Cochinilla en la base"))
      .andExpect(jsonPath("$.occurrences").value(1))
      .andExpect(jsonPath("$.detectedAt").isNotEmpty)
      .andExpect(jsonPath("$.plant.id").value(plant))
      .andExpect(jsonPath("$.transitions", hasSize<Any>(1)))
      .andExpect(jsonPath("$.transitions[0].to").value("nueva"))
  }

  @Test
  fun `a zone incident has a location and no plant`() {
    manualAlert(location = 300001, category = "seguimiento")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.location.id").value("300001"))
      .andExpect(jsonPath("$.plant").doesNotExist())
  }

  @Test
  fun `the recommended action is kept`() {
    val plant = newPlant()

    send("POST", "/alerts", json("plantId" to plant, "category" to "luz", "severity" to "baja", "reason" to "Poca luz", "recommendedAction" to "Acercarla a la ventana"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.recommendedAction").value("Acercarla a la ventana"))
  }

  @Test
  fun `two manual incidents of the same kind live together`() {
    val plant = newPlant()

    manualAlert(plant, category = "otra").andExpect(status().isCreated)
    manualAlert(plant, category = "otra").andExpect(status().isCreated)

    assertEquals(2, alertsOf(plant).size)
  }

  @Test
  fun `a plant and a location at once, or neither, answers 400`() {
    val plant = newPlant()

    manualAlert(plant, location = 300001).andExpect(status().isBadRequest)
    manualAlert().andExpect(status().isBadRequest)
    assertEquals(0, alertsOf(plant).size)
  }

  @Test
  fun `a blank reason answers 400 and saves nothing`() {
    val plant = newPlant()

    manualAlert(plant, reason = "   ").andExpect(status().isBadRequest)

    assertEquals(0, alertsOf(plant).size)
  }

  @Test
  fun `a missing reason, category or severity answers 400`() {
    val plant = newPlant()

    send("POST", "/alerts", json("plantId" to plant, "category" to "otra", "severity" to "baja")).andExpect(status().isBadRequest)
    send("POST", "/alerts", json("plantId" to plant, "severity" to "baja", "reason" to "x")).andExpect(status().isBadRequest)
    send("POST", "/alerts", json("plantId" to plant, "category" to "otra", "reason" to "x")).andExpect(status().isBadRequest)
  }

  @Test
  fun `an unknown category or severity answers 400 listing the valid ones`() {
    val plant = newPlant()

    manualAlert(plant, category = "ph")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("temperatura")))
    manualAlert(plant, severity = "gravisima")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("critica")))
  }

  @Test
  fun `a missing plant or location in the body answers 400, not 404`() {
    manualAlert(plant = "999999999").andExpect(status().isBadRequest)
    manualAlert(location = 999999999).andExpect(status().isBadRequest)
  }

  @Test
  fun `an archived plant admits an incident`() {
    val plant = newPlant(status = "muerta")

    manualAlert(plant, reason = "Se secó").andExpect(status().isCreated)
  }

  @Test
  fun `an alert cannot be deleted`() {
    val plant = newPlant()
    val id = idOf(manualAlert(plant))

    send("DELETE", "/alerts/$id").andExpect(status().isMethodNotAllowed)
  }
}

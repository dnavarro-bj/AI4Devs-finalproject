package com.cactify.alerts

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Alertas abiertas de una localización». */
class LocationOpenAlertsApiTest : AbstractAlertTest() {

  @Test
  fun `the total counts own, descendants and the plants inside, with the highest severity`() {
    val root = newLocation(name = "Invernadero")
    val child = newLocation(root, "Bancada")
    val plant = newPlant(locationId = child)
    manualAlert(location = root, severity = "baja")
    manualAlert(plant, severity = "critica")
    val closed = idOf(manualAlert(plant, severity = "critica", category = "luz"))
    send("POST", "/alerts/$closed/resolve").andExpect(status().isOk)

    send("GET", "/locations/$root")
      .andExpect(jsonPath("$.openAlerts.count").value(2))
      .andExpect(jsonPath("$.openAlerts.highestSeverity").value("critica"))
      .andExpect(jsonPath("$.ownOpenAlerts.count").value(1))
      .andExpect(jsonPath("$.ownOpenAlerts.highestSeverity").value("baja"))
  }

  @Test
  fun `own alerts include those of the plants directly in it but not of the sublocations`() {
    val root = newLocation(name = "Invernadero")
    val child = newLocation(root, "Bancada")
    val directPlant = newPlant(locationId = root)
    val nestedPlant = newPlant(locationId = child)
    manualAlert(directPlant, severity = "media")
    manualAlert(nestedPlant, severity = "critica")

    send("GET", "/locations/$root")
      .andExpect(jsonPath("$.ownOpenAlerts.count").value(1))
      .andExpect(jsonPath("$.ownOpenAlerts.highestSeverity").value("media"))
      .andExpect(jsonPath("$.openAlerts.count").value(2))
  }

  @Test
  fun `a location without alerts reports zero and no severity`() {
    val location = newLocation()

    send("GET", "/locations/$location")
      .andExpect(jsonPath("$.openAlerts.count").value(0))
      .andExpect(jsonPath("$.openAlerts.highestSeverity").doesNotExist())
  }

  @Test
  fun `a dismissed alert stops counting in the location and its ancestors`() {
    val root = newLocation(name = "Invernadero")
    val child = newLocation(root, "Bancada")
    val alert = idOf(manualAlert(location = child, severity = "media"))
    send("GET", "/locations/$root").andExpect(jsonPath("$.openAlerts.count").value(1))

    send("POST", "/alerts/$alert/dismiss").andExpect(status().isOk)

    send("GET", "/locations/$root").andExpect(jsonPath("$.openAlerts.count").value(0))
    send("GET", "/locations/$child").andExpect(jsonPath("$.openAlerts.count").value(0))
  }

  @Test
  fun `the list carries the count of every row`() {
    val root = newLocation(name = "Invernadero")
    val child = newLocation(root, "Bancada")
    manualAlert(location = child, severity = "media")

    val rows = objectMapper.readTree(
      mockMvc.perform(get("/locations").param("size", "500")).andReturn().response.contentAsString,
    ).get("content")
    val byId = rows.associateBy { it.get("id").asText() }

    assertEquals(1L, byId.getValue("$root").get("openAlerts").get("count").asLong())
    assertEquals(1L, byId.getValue("$child").get("openAlerts").get("count").asLong())
    assertEquals(0L, byId.getValue("300001").get("openAlerts").get("count").asLong())
  }

  @Test
  fun `a location with its own alerts cannot be removed`() {
    val location = newLocation()
    manualAlert(location = location)

    send("DELETE", "/locations/$location").andExpect(status().isConflict)
  }

  @Test
  fun `a location without alerts can still be removed`() {
    val location = newLocation()

    send("DELETE", "/locations/$location").andExpect(status().isNoContent)
  }
}

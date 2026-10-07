package com.cactify.alerts

import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Duration
import kotlin.test.assertEquals

/** Escenarios de «Consultar las alertas». */
class AlertListingApiTest : AbstractAlertTest() {

  private fun reasons(vararg params: Pair<String, String>): List<String> {
    val tree = objectMapper.readTree(alertsPage(*params).andReturn().response.contentAsString)
    return tree.get("content").map { it.get("reason").asText() }
  }

  @Test
  fun `filtering by status and severity counts all the matches`() {
    val plant = newPlant()
    manualAlert(plant, severity = "critica", reason = "crit abierta").andExpect(status().isCreated)
    manualAlert(plant, severity = "media", reason = "media abierta").andExpect(status().isCreated)
    val closed = idOf(manualAlert(plant, severity = "critica", reason = "crit cerrada"))
    send("POST", "/alerts/$closed/resolve").andExpect(status().isOk)

    alertsPage("plant" to plant, "status" to "nueva", "status" to "revisada", "severity" to "critica")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].reason").value("crit abierta"))
  }

  @Test
  fun `without status every alert comes`() {
    val plant = newPlant()
    manualAlert(plant)
    val closed = idOf(manualAlert(plant))
    send("POST", "/alerts/$closed/dismiss").andExpect(status().isOk)

    alertsPage("plant" to plant).andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `source and category filter`() {
    val plant = newPlant()
    reading(plant, temperature = 2)
    manualAlert(plant, category = "luz", reason = "manual de luz")

    assertEquals(listOf("manual de luz"), reasons("plant" to plant, "source" to "manual"))
    alertsPage("plant" to plant, "category" to "temperatura").andExpect(jsonPath("$.totalElements").value(1))
    alertsPage("plant" to plant, "source" to "medicion", "category" to "luz").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the plant filter keeps the alerts of each plant apart`() {
    val a = newPlant()
    val b = newPlant()
    manualAlert(a, reason = "de A")
    manualAlert(b, reason = "de B")

    assertEquals(listOf("de A"), reasons("plant" to a))
  }

  @Test
  fun `location filter with and without descendants`() {
    val parent = newLocation(name = "Invernadero")
    val child = newLocation(parent, "Bancada")
    val plantInChild = newPlant(locationId = child)
    manualAlert(location = parent, reason = "propia del padre")
    manualAlert(location = child, reason = "propia del hijo")
    manualAlert(plantInChild, reason = "de un ejemplar del hijo")

    assertEquals(listOf("propia del padre"), reasons("location" to "$parent"))
    assertEquals(
      setOf("propia del padre", "propia del hijo", "de un ejemplar del hijo"),
      reasons("location" to "$parent", "includeDescendants" to "true").toSet(),
    )
    assertEquals(setOf("propia del hijo", "de un ejemplar del hijo"), reasons("location" to "$child").toSet())
  }

  @Test
  fun `the default order is the tray one and severity is not alphabetical`() {
    val plant = newPlant()
    manualAlert(plant, severity = "baja", reason = "baja vieja")
    clock.advanceBy(Duration.ofMinutes(1))
    manualAlert(plant, severity = "critica", reason = "critica")
    clock.advanceBy(Duration.ofMinutes(1))
    manualAlert(plant, severity = "media", reason = "media vieja")
    clock.advanceBy(Duration.ofMinutes(1))
    manualAlert(plant, severity = "media", reason = "media nueva")

    assertEquals(listOf("critica", "media nueva", "media vieja", "baja vieja"), reasons("plant" to plant))
  }

  @Test
  fun `public sort keys are accepted and an unknown one answers 400`() {
    val plant = newPlant()
    manualAlert(plant, reason = "primera")
    clock.advanceBy(Duration.ofMinutes(1))
    manualAlert(plant, reason = "segunda")

    assertEquals(listOf("primera", "segunda"), reasons("plant" to plant, "sort" to "detected,asc"))
    assertEquals(listOf("segunda", "primera"), reasons("plant" to plant, "sort" to "detected,desc"))
    alertsPage("plant" to plant, "sort" to "reason,asc").andExpect(status().isBadRequest)
  }

  @Test
  fun `walking the pages loses and repeats nothing`() {
    val plant = newPlant()
    repeat(30) {
      clock.advanceBy(Duration.ofSeconds(1))
      manualAlert(plant, severity = listOf("baja", "media", "critica")[it % 3], reason = "alerta $it")
    }

    val pages = (0..2).flatMap { reasons("plant" to plant, "page" to "$it", "size" to "10") }

    assertEquals(30, pages.size)
    assertEquals(30, pages.toSet().size)
    assertEquals(reasons("plant" to plant, "size" to "30"), pages)
    alertsPage("plant" to plant, "size" to "10")
      .andExpect(jsonPath("$.totalElements").value(30))
      .andExpect(jsonPath("$.totalPages").value(3))
  }

  @Test
  fun `an unreadable filter answers 400 and an unknown id gives an empty result`() {
    alertsPage("severity" to "gravisima").andExpect(status().isBadRequest)
    alertsPage("status" to "cerrada").andExpect(status().isBadRequest)
    alertsPage("source" to "telepatia").andExpect(status().isBadRequest)
    alertsPage("plant" to "999999999")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content", hasSize<Any>(0)))
  }

  @Test
  fun `a row says who it is about and where they are`() {
    val plant = newPlant()
    manualAlert(plant, severity = "media", reason = "r")

    alertsPage("plant" to plant)
      .andExpect(jsonPath("$.content[0].plant.id").value(plant))
      .andExpect(jsonPath("$.content[0].plant.code").value("TEST-AL-$plant"))
      .andExpect(jsonPath("$.content[0].plant.speciesName").value("Echinocactus grusonii"))
      .andExpect(jsonPath("$.content[0].plant.locationName").value("Invernadero 1"))
      .andExpect(jsonPath("$.content[0].plant.locationPath").value("Invernadero 1"))
      .andExpect(jsonPath("$.content[0].location").doesNotExist())
      .andExpect(jsonPath("$.content[0].source").value("manual"))
      .andExpect(jsonPath("$.content[0].occurrences").value(1))
  }

  @Test
  fun `a zone alert carries its location with the full path`() {
    val parent = newLocation(name = "Invernadero")
    val child = newLocation(parent, "Bancada")
    manualAlert(location = child)

    alertsPage("location" to "$child")
      .andExpect(jsonPath("$.content[0].plant").doesNotExist())
      .andExpect(jsonPath("$.content[0].location.id").value("$child"))
      .andExpect(jsonPath("$.content[0].location.path").value(org.hamcrest.Matchers.startsWith("Invernadero ")))
  }

  @Test
  fun `the detail brings the history and the tasks, and an unknown alert answers 404`() {
    val plant = newPlant()
    val id = idOf(manualAlert(plant))
    send("POST", "/alerts/$id/review", """{"comment":"lo miro"}""").andExpect(status().isOk)

    send("GET", "/alerts/$id")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.transitions", hasSize<Any>(2)))
      .andExpect(jsonPath("$.transitions[0].to").value("nueva"))
      .andExpect(jsonPath("$.transitions[0].from").doesNotExist())
      .andExpect(jsonPath("$.transitions[1].from").value("nueva"))
      .andExpect(jsonPath("$.transitions[1].comment").value("lo miro"))
      .andExpect(jsonPath("$.tasks", hasSize<Any>(0)))
    send("GET", "/alerts/999999999").andExpect(status().isNotFound)
  }

  @Test
  fun `the list rows do not carry the history`() {
    val plant = newPlant()
    manualAlert(plant)

    alertsPage("plant" to plant)
      .andExpect(jsonPath("$.content[0].transitions").doesNotExist())
      .andExpect(jsonPath("$.content[0].tasks").doesNotExist())
  }

  @Test
  fun `ids travel as decimal strings`() {
    val plant = newPlant()
    manualAlert(plant)

    alertsPage("plant" to plant).andExpect(jsonPath("$.content[0].id").isString)
  }

  @Test
  fun `contains check on severity order via ids`() {
    val plant = newPlant()
    manualAlert(plant, severity = "baja", category = "luz")
    manualAlert(plant, severity = "critica", category = "humedad")

    alertsPage("plant" to plant).andExpect(jsonPath("$.content[*].severity", contains("critica", "baja")))
  }
}

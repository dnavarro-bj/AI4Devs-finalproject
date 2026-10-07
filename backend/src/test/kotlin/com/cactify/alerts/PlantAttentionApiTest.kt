package com.cactify.alerts

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Duration
import kotlin.test.assertEquals

/** Escenarios de «Nivel de atención de cada ejemplar en el listado». */
class PlantAttentionApiTest : AbstractAlertTest() {

  private fun plantsList(location: Long) = mockMvc.perform(get("/plants").param("location", "$location").param("size", "100"))

  private fun attentionOf(location: Long): Map<String, String?> =
    objectMapper.readTree(plantsList(location).andReturn().response.contentAsString).get("content")
      .associate { it.get("id").asText() to it.get("attention")?.asText() }

  @Test
  fun `the row carries the highest open severity`() {
    val location = newLocation()
    val plant = newPlant(locationId = location)
    manualAlert(plant, severity = "media", category = "luz")
    manualAlert(plant, severity = "critica", category = "humedad")
    manualAlert(plant, severity = "baja", category = "riego")

    assertEquals("critica", attentionOf(location)[plant])
  }

  @Test
  fun `a plant without open alerts has no attention`() {
    val location = newLocation()
    val quiet = newPlant(locationId = location)

    plantsList(location).andExpect(jsonPath("$.content[0].id").value(quiet)).andExpect(jsonPath("$.content[0].attention").doesNotExist())
  }

  @Test
  fun `a closed alert does not count`() {
    val location = newLocation()
    val plant = newPlant(locationId = location)
    val alert = idOf(manualAlert(plant, severity = "critica"))
    send("POST", "/alerts/$alert/resolve").andExpect(status().isOk)

    assertEquals(null, attentionOf(location)[plant])
  }

  @Test
  fun `each row has its own attention`() {
    val location = newLocation()
    val a = newPlant(locationId = location)
    val b = newPlant(locationId = location)
    val c = newPlant(locationId = location)
    manualAlert(a, severity = "baja")
    manualAlert(b, severity = "media")

    val attention = attentionOf(location)

    assertEquals("baja", attention[a])
    assertEquals("media", attention[b])
    assertEquals(null, attention[c])
  }

  @Test
  fun `a page of 25 plants gets its attention from one aggregated query`() {
    val location = newLocation()
    val plants = (1..25).map { newPlant(locationId = location) }
    plants.forEach { manualAlert(it, severity = "media") }
    flushPersistenceContext()
    entityManager.clear()

    val statistics = entityManager.entityManagerFactory.unwrap(org.hibernate.SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    statistics.clear()
    plantsList(location).andExpect(status().isOk)
    val queries = statistics.prepareStatementCount
    statistics.isStatisticsEnabled = false

    // El listado, su recuento, la atención y las ciudades de las relaciones: nunca una consulta por fila.
    assertEquals(true, queries < 10, "demasiadas consultas para 25 filas: $queries")
  }

  @Test
  fun `the detail brings the open alerts from the gravest to the lightest`() {
    val plant = newPlant()
    manualAlert(plant, severity = "baja", category = "riego", reason = "leve")
    clock.advanceBy(Duration.ofMinutes(1))
    manualAlert(plant, severity = "critica", category = "luz", reason = "grave")
    clock.advanceBy(Duration.ofMinutes(1))
    manualAlert(plant, severity = "media", category = "humedad", reason = "media")
    val closed = idOf(manualAlert(plant, severity = "critica", category = "temperatura", reason = "cerrada"))
    send("POST", "/alerts/$closed/dismiss").andExpect(status().isOk)

    send("GET", "/plants/$plant")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.openAlerts", hasSize<Any>(3)))
      .andExpect(jsonPath("$.openAlerts[0].reason").value("grave"))
      .andExpect(jsonPath("$.openAlerts[1].reason").value("media"))
      .andExpect(jsonPath("$.openAlerts[2].reason").value("leve"))
  }

  @Test
  fun `a plant without alerts has an empty list`() {
    val plant = newPlant()

    send("GET", "/plants/$plant").andExpect(jsonPath("$.openAlerts", hasSize<Any>(0)))
  }
}

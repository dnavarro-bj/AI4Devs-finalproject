package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Registrar una lectura dispara la detección de medición». */
class CareRecordAlertApiTest : AbstractTimelineApiTest() {

  private fun addReading(plant: String, vararg values: Pair<String, Any?>) =
    mockMvc.perform(post("/plants/$plant/care-records").contentType(MediaType.APPLICATION_JSON).content(json(*values)))

  private fun alertCount(plant: String): Long {
    flushPersistenceContext()
    return jdbcTemplate.queryForObject("SELECT count(*) FROM alert WHERE plant_id = ?", Long::class.java, plant.toLong())!!
  }

  @Test
  fun `a reading out of range answers 201 with the reading and opens an alert`() {
    val plant = createPlant()

    addReading(plant, "temperature" to 2)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.temperature").value(2))
      .andExpect(jsonPath("$.alerts").doesNotExist())

    assertEquals(1, alertCount(plant))
  }

  @Test
  fun `a reading inside the range opens nothing`() {
    val plant = createPlant()

    addReading(plant, "temperature" to 22, "humidity" to 20).andExpect(status().isCreated)

    assertEquals(0, alertCount(plant))
  }

  @Test
  fun `an invalid reading leaves no alert`() {
    val plant = createPlant()

    addReading(plant, "humidity" to 140).andExpect(status().isBadRequest)

    assertEquals(0, alertCount(plant))
  }

  @Test
  fun `a reading without any value is rejected and leaves no alert`() {
    val plant = createPlant()

    addReading(plant).andExpect(status().isBadRequest)

    assertEquals(0, alertCount(plant))
  }

  @Test
  fun `readings that already existed are not evaluated when the migration runs`() {
    val plant = createPlant()
    flushPersistenceContext()
    jdbcTemplate.update(
      "INSERT INTO care_record (id, plant_id, temperature, recorded_at) VALUES (?, ?, -30, now())",
      991_001L, plant.toLong(),
    )

    assertEquals(0, alertCount(plant), "una lectura anterior no abre alertas por sí sola")
  }
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.MutableClock
import com.cactify.MutableClockConfiguration
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Duration
import kotlin.test.assertEquals

/**
 * Escenarios de "Alta de una lectura de cultivo", "Fecha de la lectura", "Rechazo de lecturas con
 * fecha futura" y la parte de alta de "Lectura sobre una planta inexistente".
 */
@Import(MutableClockConfiguration::class)
class CareRecordCreationApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Autowired
  lateinit var clock: MutableClock

  // --- Alta de una lectura de cultivo ---

  @Test
  fun `a reading with all five values answers 201 with what was sent`() {
    val plantId = createPlant("Bola con lectura completa")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "temperature" to 24, "lightHours" to 8, "waterAmountMl" to 150, "soilPh" to "6.2")),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.humidity").value(35))
      .andExpect(jsonPath("$.temperature").value(24))
      .andExpect(jsonPath("$.lightHours").value(8))
      .andExpect(jsonPath("$.waterAmountMl").value(150))
      .andExpect(jsonPath("$.soilPh").value(6.2))
  }

  @Test
  fun `a partial reading is accepted and leaves the other values empty`() {
    val plantId = createPlant("Bola con lectura parcial")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.humidity").value(35))
      .andExpect(jsonPath("$.temperature").doesNotExist())
      .andExpect(jsonPath("$.soilPh").doesNotExist())
  }

  @Test
  fun `a reading with no value at all is rejected with 400`() {
    val plantId = createPlant("Bola sin valores")
    val before = countCareRecords()

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{}"),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.error").value("Bad Request"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/plants/$plantId/care-records"))

    assertEquals(before, countCareRecords(), "no debía registrarse ninguna lectura")
  }

  @Test
  fun `a reading belongs to its plant and shows up in no other`() {
    val mine = createPlant("Bola con lectura propia")
    val other = createPlant("Bola ajena")
    createReading(mine, mapOf("humidity" to 35))

    mockMvc.perform(get("/plants/$mine/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))

    mockMvc.perform(get("/plants/$other/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  // --- Fecha de la lectura ---

  @Test
  fun `a reading without a date is stamped by the server`() {
    val plantId = createPlant("Bola sin fecha")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.recordedAt").value(clock.instant().toString()))
  }

  @Test
  fun `a date given by the client is kept as sent`() {
    val plantId = createPlant("Bola con fecha propia")

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "recordedAt" to "2026-07-01T06:00:00Z")),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.recordedAt").value("2026-07-01T06:00:00Z"))
  }

  @Test
  fun `an older reading lands in its place in the listing, not first`() {
    val plantId = createPlant("Bola con lectura intercalada")
    // Todas anteriores al reloj congelado (2026-08-14T09:30Z): una fecha futura se rechaza.
    createReading(plantId, mapOf("humidity" to 1, "recordedAt" to "2026-08-01T10:00:00Z"))
    createReading(plantId, mapOf("humidity" to 2, "recordedAt" to "2026-08-12T10:00:00Z"))
    createReading(plantId, mapOf("humidity" to 3, "recordedAt" to "2026-08-06T10:00:00Z"))

    mockMvc.perform(get("/plants/$plantId/care-records"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].humidity").value(2))
      .andExpect(jsonPath("$.content[1].humidity").value(3))
      .andExpect(jsonPath("$.content[2].humidity").value(1))
  }

  // --- Rechazo de lecturas con fecha futura ---

  @Test
  fun `a date well beyond the tolerance window is rejected with 400`() {
    val plantId = createPlant("Bola con fecha futura")
    val farFuture = clock.instant().plus(Duration.ofDays(1))

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "recordedAt" to farFuture.toString())),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(containsString("fecha")))
  }

  @Test
  fun `a slightly future date within the tolerance window is accepted`() {
    val plantId = createPlant("Bola con fecha casi futura")
    val slightlyAhead = clock.instant().plus(Duration.ofMinutes(2))

    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35, "recordedAt" to slightlyAhead.toString())),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.recordedAt").value(slightlyAhead.toString()))
  }

  // --- Planta inexistente ---

  @Test
  fun `creating a reading on a nonexistent plant answers 404`() {
    mockMvc.perform(
      post("/plants/999999999/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 35)),
    )
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  private fun createPlant(nickname: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun createReading(plantId: String, body: Map<String, Any?>) {
    mockMvc.perform(
      post("/plants/$plantId/care-records")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(body)),
    ).andExpect(status().isCreated)
  }

  private fun countCareRecords(): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM care_record", Int::class.java) ?: 0
}

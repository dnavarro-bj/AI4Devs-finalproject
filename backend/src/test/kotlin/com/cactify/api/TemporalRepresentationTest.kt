package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.domain.CareRecord
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import org.hamcrest.Matchers.endsWith
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import kotlin.test.assertEquals

/**
 * Escenarios de "Representación temporal de las fechas": una fecha es un instante, y el API la
 * expone siempre en tiempo universal, con independencia de la zona de la máquina que sirve.
 */
class TemporalRepresentationTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"

  @Test
  fun `a persisted date comes back as the same instant`() {
    val taken = Instant.parse("2026-08-14T09:30:00Z")
    val record = persistCareRecord(taken)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(CareRecord::class.java, record.id)

    assertEquals(taken, reloaded.recordedAt)
  }

  @Test
  fun `a date given with a non-universal offset is stored as the equivalent instant`() {
    // Las 08:00 en +02:00 son las 06:00 en tiempo universal: el mismo momento.
    val inMadrid = OffsetDateTime.of(2026, 8, 14, 8, 0, 0, 0, ZoneOffset.ofHours(2)).toInstant()
    val record = persistCareRecord(inMadrid)
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(CareRecord::class.java, record.id)

    assertEquals(Instant.parse("2026-08-14T06:00:00Z"), reloaded.recordedAt)
    assertEquals(inMadrid, reloaded.recordedAt)
  }

  @Test
  fun `a date served by the API is represented in universal time`() {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola temporal", "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    val plantId = objectMapper.readTree(response).get("id").asText()

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.createdAt").value(endsWith("Z")))
  }

  private fun persistCareRecord(recordedAt: Instant): CareRecord {
    val species = entityManager.find(Species::class.java, SpeciesId.from(seededSpeciesId))
    val location = entityManager.find(Location::class.java, LocationId.from(seededLocationId))
    val plant = Plant(nickname = "Bola temporal", location = location, species = species)
    entityManager.persist(plant)
    val record = CareRecord(plant = plant, humidity = 30, recordedAt = recordedAt)
    entityManager.persist(record)
    return record
  }
}

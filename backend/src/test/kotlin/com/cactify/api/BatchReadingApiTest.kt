package com.cactify.api

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.assertEquals

/** Escenarios de «Registrar una lectura por lote». */
class BatchReadingApiTest : AbstractBatchApiTest() {

  /** Un instante pasado y redondo a segundos: el servidor rechaza el futuro y la serialización no añade ceros. */
  private val at: Instant = Instant.now().minus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS)

  @Test
  fun `a watering on a tray leaves one reading per plant with the same instant and batch`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    val batchId = idOf(
      applyBatch(locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 200), "occurredAt" to at.toString())
        .andExpect(status().isCreated)
        .andExpect(jsonPath("$.action").value("lectura"))
        .andExpect(jsonPath("$.scopeKind").value("localizacion"))
        .andExpect(jsonPath("$.plantCount").value(3))
        .andExpect(jsonPath("$.occurredAt").value(at.toString())),
    )

    plants.forEach { plant ->
      careRecordsOf(plant)
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].waterAmountMl").value(200))
        .andExpect(jsonPath("$.content[0].recordedAt").value(at.toString()))
        .andExpect(jsonPath("$.content[0].batchId").value(batchId))
    }
  }

  @Test
  fun `excluded plants get no reading`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 150), "excludedPlantIds" to listOf(plants[0], plants[1]))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.plantCount").value(1))

    careRecordsOf(plants[0]).andExpect(jsonPath("$.totalElements").value(0))
    careRecordsOf(plants[1]).andExpect(jsonPath("$.totalElements").value(0))
    careRecordsOf(plants[2]).andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `a reading with no measure is rejected and no plant receives anything`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "reading" to emptyMap<String, Any>()).andExpect(status().isBadRequest)

    plants.forEach { careRecordsOf(it).andExpect(jsonPath("$.totalElements").value(0)) }
    assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM batch", Long::class.java))
  }

  @Test
  fun `a measure out of range is rejected like an individual reading`() {
    createPlantIn(invernadero)

    applyBatch(locationScope(invernadero), "reading" to mapOf("humidity" to 140)).andExpect(status().isBadRequest)
  }

  @Test
  fun `a future instant is rejected`() {
    createPlantIn(invernadero)

    applyBatch(locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 100), "occurredAt" to Instant.now().plusSeconds(86_400).toString())
      .andExpect(status().isBadRequest)
  }

  @Test
  fun `the reading appears first in each timeline with its batch and size`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    val batchId = idOf(applyBatch(locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 200)).andExpect(status().isCreated))

    plants.forEach { plant ->
      timeline(plant)
        .andExpect(jsonPath("$.content[0].type").value("lectura"))
        .andExpect(jsonPath("$.content[0].batchId").value(batchId))
        .andExpect(jsonPath("$.content[0].batchSize").value(3))
        .andExpect(jsonPath("$.content[0].reading.batchId").value(batchId))
    }
  }

  @Test
  fun `an individual reading carries no batch`() {
    val plant = createPlantIn(invernadero)

    send("POST", "/plants/$plant/care-records", json("waterAmountMl" to 100, "batchId" to "123456"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.batchId").doesNotExist())

    timeline(plant)
      .andExpect(jsonPath("$.content[0].batchId").doesNotExist())
      .andExpect(jsonPath("$.content[0].batchSize").doesNotExist())
  }

  @Test
  fun `a reading registered by a task carries no batch`() {
    val plant = createPlantIn(invernadero)
    val id = newTask("locationId" to null, "plantIds" to listOf(plant))

    complete(id, "reading" to mapOf("waterAmountMl" to 100)).andExpect(status().isOk)

    timeline(plant, "type" to "lectura").andExpect(jsonPath("$.content[0].batchId").doesNotExist())
    careRecordsOf(plant).andExpect(jsonPath("$.content[*].batchId", hasSize<Any>(0)))
  }

  @Test
  fun `the batch can be read back`() {
    createPlantIn(invernadero)
    val batchId = idOf(applyBatch(locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 200)).andExpect(status().isCreated))

    send("GET", "/batches/$batchId")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(batchId))
      .andExpect(jsonPath("$.action").value("lectura"))
      .andExpect(jsonPath("$.scopeKind").value("localizacion"))
      .andExpect(jsonPath("$.plantCount").value(1))
      .andExpect(jsonPath("$.occurredAt").exists())
  }

  @Test
  fun `a batch that does not exist is a 404`() {
    send("GET", "/batches/123456789").andExpect(status().isNotFound)
  }
}

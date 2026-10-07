package com.cactify.api

import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant

/** Escenarios de «Cronología unificada del ejemplar» y «Los eventos de un lote conservan su operación». */
class PlantTimelineApiTest : AbstractTimelineApiTest() {

  private fun addReading(plant: String, at: Instant? = null) =
    mockMvc.perform(
      post("/plants/$plant/care-records").contentType(MediaType.APPLICATION_JSON)
        .content(json("humidity" to 30, "recordedAt" to at?.toString())),
    ).andExpect(status().isCreated)

  @Test
  fun `the six types come mixed and newest first`() {
    val plant = createPlant()
    addReading(plant, daysAgo(60))
    send("PUT", "/plants/$plant/status", json("status" to "cuarentena")).andExpect(status().isOk)
    send("PUT", "/plants/$plant", json("nickname" to "Bola", "locationId" to "300002", "speciesId" to "200001"))
      .andExpect(status().isOk)
    addComment(plant, "Nota", daysAgo(40))
    addIntervention(plant, "poda", "occurredAt" to daysAgo(30).toString())
    addBloom(plant, "en_flor", dateDaysAgo(20))

    timeline(plant)
      .andExpect(jsonPath("$.totalElements").value(6))
      .andExpect(jsonPath("$.content[*].type", hasSize<Any>(6)))
      .andExpect(jsonPath("$.content[0].type").value(org.hamcrest.Matchers.anyOf(
        org.hamcrest.Matchers.`is`("cambio_estado"), org.hamcrest.Matchers.`is`("movimiento"))))
      .andExpect(jsonPath("$.content[2].type").value("floracion"))
      .andExpect(jsonPath("$.content[3].type").value("intervencion"))
      .andExpect(jsonPath("$.content[4].type").value("comentario"))
      .andExpect(jsonPath("$.content[5].type").value("lectura"))
  }

  @Test
  fun `each entry carries the detail of its own type only`() {
    val plant = createPlant()
    addReading(plant, daysAgo(2))
    addComment(plant, "Hola", daysAgo(1))

    timeline(plant)
      .andExpect(jsonPath("$.content[0].comment.text").value("Hola"))
      .andExpect(jsonPath("$.content[0].reading").doesNotExist())
      .andExpect(jsonPath("$.content[0].bloom").doesNotExist())
      .andExpect(jsonPath("$.content[1].reading.humidity").value(30))
      .andExpect(jsonPath("$.content[1].comment").doesNotExist())
  }

  @Test
  fun `a reading appears at once`() {
    val plant = createPlant()
    addComment(plant, "Antes", daysAgo(1))

    addReading(plant)

    timeline(plant).andExpect(jsonPath("$.content[0].type").value("lectura"))
  }

  @Test
  fun `a status change and a movement show their details`() {
    val plant = createPlant()
    send("PUT", "/plants/$plant/status", json("status" to "enferma", "reason" to "Manchas")).andExpect(status().isOk)
    send("PUT", "/plants/$plant", json("nickname" to "Bola", "locationId" to "300002", "speciesId" to "200001"))
      .andExpect(status().isOk)

    timeline(plant, "type" to "cambio_estado")
      .andExpect(jsonPath("$.content[0].statusChange.from").value("activa"))
      .andExpect(jsonPath("$.content[0].statusChange.to").value("enferma"))
      .andExpect(jsonPath("$.content[0].statusChange.reason").value("Manchas"))
    timeline(plant, "type" to "movimiento")
      .andExpect(jsonPath("$.content[0].movement.from.id").value("300001"))
      .andExpect(jsonPath("$.content[0].movement.to.id").value("300002"))
      .andExpect(jsonPath("$.content[0].movement.to.name").isNotEmpty)
  }

  @Test
  fun `a reading brings its recommendation`() {
    val plant = createPlant()
    addReading(plant)
    val readingId = objectMapper.readTree(timeline(plant).andReturn().response.contentAsString).get("content").get(0).get("id").asText()
    org.junit.jupiter.api.Assertions.assertEquals(
      readingId,
      objectMapper.readTree(timeline(plant).andReturn().response.contentAsString).get("content").get(0).get("reading").get("id").asText(),
    )
  }

  @Test
  fun `events with the same instant keep a stable order`() {
    val plant = createPlant()
    val at = daysAgo(3)
    repeat(5) { addComment(plant, "Mismo instante $it", at) }

    val first = timeline(plant).andReturn().response.contentAsString
    val second = timeline(plant).andReturn().response.contentAsString

    org.junit.jupiter.api.Assertions.assertEquals(first, second)
  }

  @Test
  fun `a plant without history answers an empty page`() {
    timeline(createPlant())
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content", hasSize<Any>(0)))
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a missing plant answers 404`() {
    timeline("999999999").andExpect(status().isNotFound)
  }

  @Test
  fun `the events of another plant do not appear`() {
    val a = createPlant()
    val b = createPlant()
    addComment(a, "De A")
    addReading(b)
    addBloom(b)

    timeline(a)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].comment.text").value("De A"))
  }

  @Test
  fun `a batch id is returned when present and omitted when not`() {
    val a = createPlant()
    val b = createPlant()
    val inBatchA = idOf(addComment(a, "Con lote"))
    val inBatchB = idOf(addComment(b, "Con lote"))
    addComment(a, "Sin lote")
    flushPersistenceContext()
    jdbcTemplate.update("UPDATE plant_event SET batch_id = 777 WHERE id IN (?, ?)", inBatchA.toLong(), inBatchB.toLong())
    entityManager.clear()

    timeline(a)
      .andExpect(jsonPath("$.content[?(@.comment.text == 'Con lote')].batchId", contains("777")))
      .andExpect(jsonPath("$.content[?(@.comment.text == 'Sin lote')].batchId", hasSize<Any>(0)))
    timeline(b).andExpect(jsonPath("$.content[0].batchId").value("777"))
  }
}

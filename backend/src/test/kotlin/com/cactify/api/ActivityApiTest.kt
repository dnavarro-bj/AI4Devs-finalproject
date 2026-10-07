package com.cactify.api

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Escenarios de «Actividad reciente». */
class ActivityApiTest : AbstractBatchApiTest() {

  private fun activity(vararg params: Pair<String, String>) =
    send("GET", "/activity" + if (params.isEmpty()) "" else params.joinToString("&", "?") { "${it.first}=${it.second}" })

  private fun entries(vararg params: Pair<String, String>) = readTree(activity(*params)).get("content").toList()

  private fun typesOf(vararg params: Pair<String, String>) = entries(*params).map { it.get("type").asText() }

  private fun hoursAgo(hours: Long): Instant = Instant.now().minus(hours, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS)

  @Test
  fun `a batch is one line however many plants it touched`() {
    repeat(4) { createPlantIn(invernadero) }
    applyBatch(locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 200)).andExpect(status().isCreated)

    val lines = entries()
    assertEquals(listOf("lote"), lines.map { it.get("type").asText() })
    val batch = lines.single().get("batch")
    assertEquals("lectura", batch.get("action").asText())
    assertEquals(4, batch.get("plantCount").asInt())
    assertFalse(lines.single().has("plant"), "un lote no pertenece a una planta")
  }

  @Test
  fun `a completed task is one line without the events of its plants or its linked reading`() {
    val plants = (1..3).map { createPlantIn(invernadero) }
    val task = newTask("locationId" to invernadero, "title" to "Regar el invernadero")
    complete(task, "reading" to mapOf("waterAmountMl" to 150)).andExpect(status().isOk)

    val lines = entries()
    assertEquals(listOf("tarea"), lines.map { it.get("type").asText() })
    val detail = lines.single().get("task")
    assertEquals(task, detail.get("id").asText())
    assertEquals("Regar el invernadero", detail.get("title").asText())
    assertEquals("riego", detail.get("type").asText())
    assertEquals(plants.size, detail.get("affectedPlants").asInt())
  }

  @Test
  fun `a loose comment shows its plant and the start of its text`() {
    val plant = createPlantIn(invernadero, nickname = "Bola verde")
    val long = "Una marca nueva en el lado oeste. ".repeat(12)
    addComment(plant, long).andExpect(status().isCreated)

    val line = entries().single()
    assertEquals("comentario", line.get("type").asText())
    assertEquals(plant, line.get("plant").get("id").asText())
    assertEquals("Bola verde", line.get("plant").get("nickname").asText())
    assertTrue(line.get("plant").get("code").asText().isNotBlank())
    val excerpt = line.get("comment").get("excerpt").asText()
    assertTrue(excerpt.startsWith("Una marca nueva"))
    assertTrue(excerpt.length < long.length, "el comienzo, no el texto entero")
  }

  @Test
  fun `a loose intervention shows its plant and its type`() {
    val plant = createPlantIn(invernadero)
    addIntervention(plant, "poda").andExpect(status().isCreated)

    val line = entries().single()
    assertEquals("intervencion", line.get("type").asText())
    assertEquals(plant, line.get("plant").get("id").asText())
    assertEquals("poda", line.get("intervention").get("type").asText())
  }

  @Test
  fun `comments and interventions that belong to a batch or a task do not show up alone`() {
    val plant = createPlantIn(invernadero)
    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "movidas por el frío")).andExpect(status().isCreated)
    applyBatch(locationScope(invernadero), "intervention" to mapOf("type" to "poda")).andExpect(status().isCreated)
    val task = newTask("locationId" to invernadero)
    complete(task, "intervention" to mapOf("type" to "poda")).andExpect(status().isOk)

    assertEquals(listOf("tarea", "lote", "lote").sorted(), typesOf().sorted())
    assertTrue(entries().none { it.has("plant") }, "ninguna línea suelta de la planta $plant")
  }

  @Test
  fun `what is not activity does not show`() {
    val plant = createPlantIn(invernadero)
    send("POST", "/plants/$plant/care-records", json("waterAmountMl" to 100)).andExpect(status().isCreated)
    send("PUT", "/plants/$plant/status", json("status" to "cuarentena", "reason" to "prueba")).andExpect(status().isOk)
    send("POST", "/locations/$bandeja/movements", json("plantIds" to listOf(plant))).andExpect(status().isOk)

    activity().andExpect(status().isOk).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `an open skipped or cancelled task does not show`() {
    createPlantIn(invernadero)
    newTask("locationId" to invernadero)
    val skipped = newTask("locationId" to invernadero)
    val cancelled = newTask("locationId" to invernadero)
    send("POST", "/tasks/$skipped/skip", json("reason" to "lluvia")).andExpect(status().isOk)
    send("POST", "/tasks/$cancelled/cancel", json()).andExpect(status().isOk)

    activity().andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `newest first and a stable order when two entries share an instant`() {
    val plant = createPlantIn(invernadero)
    val at = hoursAgo(2)
    addComment(plant, "primero", at.minus(1, ChronoUnit.HOURS)).andExpect(status().isCreated)
    addComment(plant, "segundo", at).andExpect(status().isCreated)
    addComment(plant, "tercero", at).andExpect(status().isCreated)

    val first = entries().map { "${it.get("type").asText()}:${it.get("id").asText()}" }
    val again = entries().map { "${it.get("type").asText()}:${it.get("id").asText()}" }

    assertEquals(first, again)
    assertEquals("primero", entries().last().get("comment").get("excerpt").asText())
  }

  @Test
  fun `it is paginated`() {
    val plant = createPlantIn(invernadero)
    repeat(12) { addComment(plant, "Nota $it", hoursAgo(20L - it)).andExpect(status().isCreated) }

    activity("size" to "5")
      .andExpect(jsonPath("$.content", hasSize<Any>(5)))
      .andExpect(jsonPath("$.totalElements").value(12))
      .andExpect(jsonPath("$.totalPages").value(3))
  }

  @Test
  fun `with no activity it answers an empty page`() {
    activity().andExpect(status().isOk).andExpect(jsonPath("$.totalElements").value(0)).andExpect(jsonPath("$.content", hasSize<Any>(0)))
  }

  @Test
  fun `the four kinds are mixed in a single list in instant order`() {
    val plant = createPlantIn(invernadero)
    addComment(plant, "uno", hoursAgo(4)).andExpect(status().isCreated)
    addIntervention(plant, "revision", "occurredAt" to hoursAgo(3).toString()).andExpect(status().isCreated)
    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "lote")).andExpect(status().isCreated)
    complete(newTask("locationId" to invernadero)).andExpect(status().isOk)

    assertEquals(setOf("lote", "tarea", "comentario", "intervencion"), typesOf().toSet())
    assertEquals(4, entries().size)
  }
}

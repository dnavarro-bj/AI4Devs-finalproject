package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

/** Ayudas comunes de los tests de la cronología y de los eventos de la ficha. */
abstract class AbstractTimelineApiTest : AbstractApiIntegrationTest() {

  protected fun createPlant(): String {
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to "300001", "speciesId" to "200001")),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  protected fun daysAgo(days: Long): Instant = Instant.now().minus(days, ChronoUnit.DAYS)
  protected fun dateDaysAgo(days: Long): LocalDate = LocalDate.now(ZoneOffset.UTC).minusDays(days)

  protected fun send(method: String, path: String, body: String? = null): ResultActions {
    val builder = when (method) {
      "POST" -> post(path)
      "PUT" -> put(path)
      "DELETE" -> delete(path)
      else -> get(path)
    }
    if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(body)
    return mockMvc.perform(builder)
  }

  protected fun idOf(result: ResultActions): String =
    objectMapper.readTree(result.andReturn().response.contentAsString).get("id").asText()

  protected fun addComment(plant: String, text: String = "Nota", at: Instant? = null): ResultActions =
    send("POST", "/plants/$plant/comments", json("text" to text, "occurredAt" to at?.toString()))

  protected fun addIntervention(plant: String, type: String, vararg extra: Pair<String, Any?>): ResultActions =
    send("POST", "/plants/$plant/interventions", json("type" to type, *extra))

  protected fun addBloom(plant: String, status: String = "en_flor", start: LocalDate = dateDaysAgo(10), vararg extra: Pair<String, Any?>): ResultActions =
    send("POST", "/plants/$plant/blooms", json("startedOn" to start.toString(), "status" to status, *extra))

  protected fun timeline(plant: String, vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(get("/plants/$plant/timeline").apply { params.forEach { (k, v) -> param(k, v) } })
}

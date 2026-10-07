package com.cactify.alerts

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Duration
import kotlin.test.assertEquals

/** Escenarios de «Las alertas del ejemplar en su cronología». */
class AlertTimelineApiTest : AbstractAlertTest() {

  private fun timeline(plant: String, vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(get("/plants/$plant/timeline").apply { params.forEach { (k, v) -> param(k, v) } })

  @Test
  fun `opening, review and resolution are three entries, the first without a previous state`() {
    val plant = newPlant()
    val alert = idOf(manualAlert(plant, category = "luz", severity = "media", reason = "Poca luz"))
    clock.advanceBy(Duration.ofMinutes(10))
    send("POST", "/alerts/$alert/review", """{"comment":"Lo miro"}""").andExpect(status().isOk)
    clock.advanceBy(Duration.ofMinutes(10))
    send("POST", "/alerts/$alert/resolve", """{"comment":"Acercada a la ventana"}""").andExpect(status().isOk)

    timeline(plant, "type" to "alerta")
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[0].type").value("alerta"))
      .andExpect(jsonPath("$.content[0].alert.to").value("resuelta"))
      .andExpect(jsonPath("$.content[0].alert.from").value("revisada"))
      .andExpect(jsonPath("$.content[0].alert.comment").value("Acercada a la ventana"))
      .andExpect(jsonPath("$.content[1].alert.to").value("revisada"))
      .andExpect(jsonPath("$.content[2].alert.to").value("nueva"))
      .andExpect(jsonPath("$.content[2].alert.from").doesNotExist())
      .andExpect(jsonPath("$.content[2].alert.alertId").value(alert))
      .andExpect(jsonPath("$.content[2].alert.category").value("luz"))
      .andExpect(jsonPath("$.content[2].alert.reason").value("Poca luz"))
  }

  @Test
  fun `an entry carries only its own detail`() {
    val plant = newPlant()
    manualAlert(plant)

    timeline(plant)
      .andExpect(jsonPath("$.content[0].alert").exists())
      .andExpect(jsonPath("$.content[0].reading").doesNotExist())
      .andExpect(jsonPath("$.content[0].comment").doesNotExist())
  }

  @Test
  fun `later occurrences are not events`() {
    val plant = newPlant()
    reading(plant, temperature = 8)
    repeat(5) { reading(plant, temperature = 8) }

    timeline(plant, "type" to "alerta").andExpect(jsonPath("$.totalElements").value(1))
    assertEquals(6, alertsOf(plant).single()["occurrences"])
  }

  @Test
  fun `an alert opened by a reading shows up next to the reading`() {
    val plant = newPlant()
    reading(plant, temperature = 8)

    timeline(plant)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].type", org.hamcrest.Matchers.containsInAnyOrder("lectura", "alerta")))
  }

  @Test
  fun `a location alert does not appear in its plants timeline`() {
    val plant = newPlant()
    manualAlert(location = 300001)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the alerts of another plant do not appear`() {
    val a = newPlant()
    val b = newPlant()
    manualAlert(a)
    manualAlert(b)

    timeline(a, "type" to "alerta").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the filter keeps the order relative to the full timeline`() {
    val plant = newPlant()
    val ids = mutableListOf<String>()
    repeat(4) {
      clock.advanceBy(Duration.ofMinutes(1))
      ids += idOf(manualAlert(plant, reason = "a$it"))
      clock.advanceBy(Duration.ofMinutes(1))
      send("POST", "/plants/$plant/comments", json("text" to "c$it")).andExpect(status().isCreated)
    }

    val all = objectMapper.readTree(timeline(plant, "size" to "50").andReturn().response.contentAsString).get("content")
      .filter { it.get("type").asText() == "alerta" }.map { it.get("id").asText() }
    val filtered = objectMapper.readTree(timeline(plant, "type" to "alerta", "size" to "50").andReturn().response.contentAsString).get("content")
      .map { it.get("id").asText() }

    assertEquals(all, filtered)
  }

  @Test
  fun `walking the pages with alerts loses and repeats nothing`() {
    val plant = newPlant()
    repeat(6) {
      clock.advanceBy(Duration.ofMinutes(1))
      val a = idOf(manualAlert(plant, reason = "a$it"))
      send("POST", "/alerts/$a/review").andExpect(status().isOk)
      send("POST", "/plants/$plant/comments", json("text" to "c$it")).andExpect(status().isCreated)
    }

    val ids = (0..3).flatMap { page ->
      objectMapper.readTree(timeline(plant, "page" to "$page", "size" to "5").andReturn().response.contentAsString).get("content")
        .map { it.get("type").asText() + ":" + it.get("id").asText() }
    }

    assertEquals(18, ids.size)
    assertEquals(18, ids.toSet().size)
    timeline(plant, "size" to "5").andExpect(jsonPath("$.totalElements").value(18)).andExpect(jsonPath("$.totalPages").value(4))
  }

  @Test
  fun `a manual alert on a plant puts its opening with the reason`() {
    val plant = newPlant()

    manualAlert(plant, reason = "Cochinilla en la base")

    timeline(plant)
      .andExpect(jsonPath("$.content", hasSize<Any>(1)))
      .andExpect(jsonPath("$.content[0].alert.reason").value("Cochinilla en la base"))
  }

  @Test
  fun `the same instant keeps a stable order between alerts and other events`() {
    val plant = newPlant()
    manualAlert(plant, category = "luz")
    manualAlert(plant, category = "humedad")
    manualAlert(plant, category = "riego")

    val first = timeline(plant).andReturn().response.contentAsString
    val second = timeline(plant).andReturn().response.contentAsString

    assertEquals(first, second)
  }
}

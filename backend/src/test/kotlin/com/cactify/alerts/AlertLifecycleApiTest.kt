package com.cactify.alerts

import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Duration
import kotlin.test.assertEquals

/** Escenarios de «Ciclo de vida y transiciones registradas». */
class AlertLifecycleApiTest : AbstractAlertTest() {

  private fun newAlert(): String = idOf(manualAlert(newPlant()))

  @Test
  fun `going through the whole cycle records three transitions with their instants`() {
    val id = newAlert()
    clock.advanceBy(Duration.ofMinutes(5))
    send("POST", "/alerts/$id/review", """{"comment":"Lo reviso"}""").andExpect(status().isOk).andExpect(jsonPath("$.status").value("revisada"))
    clock.advanceBy(Duration.ofMinutes(5))

    send("POST", "/alerts/$id/resolve", """{"comment":"Movida a la sombra"}""")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("resuelta"))
      .andExpect(jsonPath("$.resolvedAt").isNotEmpty)
      .andExpect(jsonPath("$.resolutionComment").value("Movida a la sombra"))
      .andExpect(jsonPath("$.closedAt").isNotEmpty)
      .andExpect(jsonPath("$.transitions", hasSize<Any>(3)))
      .andExpect(jsonPath("$.transitions[0].to").value("nueva"))
      .andExpect(jsonPath("$.transitions[1].to").value("revisada"))
      .andExpect(jsonPath("$.transitions[2].to").value("resuelta"))
      .andExpect(jsonPath("$.transitions[2].from").value("revisada"))
  }

  @Test
  fun `resolving a new alert directly leaves out the review`() {
    val id = newAlert()

    send("POST", "/alerts/$id/resolve")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("resuelta"))
      .andExpect(jsonPath("$.transitions", hasSize<Any>(2)))
  }

  @Test
  fun `dismissing is not resolving`() {
    val id = newAlert()

    send("POST", "/alerts/$id/dismiss", """{"comment":"Falsa alarma"}""")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("descartada"))
      .andExpect(jsonPath("$.closedAt").isNotEmpty)
      .andExpect(jsonPath("$.closureComment").value("Falsa alarma"))
      .andExpect(jsonPath("$.resolvedAt").doesNotExist())
      .andExpect(jsonPath("$.resolutionComment").doesNotExist())
      .andExpect(jsonPath("$.transitions[1].to").value("descartada"))
  }

  @Test
  fun `a closed alert admits no further change and keeps its history`() {
    val id = newAlert()
    send("POST", "/alerts/$id/resolve", """{"comment":"ok"}""").andExpect(status().isOk)

    send("POST", "/alerts/$id/review").andExpect(status().isConflict)
    send("POST", "/alerts/$id/resolve", """{"comment":"otra vez"}""").andExpect(status().isConflict)
    send("POST", "/alerts/$id/dismiss").andExpect(status().isConflict)

    send("GET", "/alerts/$id")
      .andExpect(jsonPath("$.status").value("resuelta"))
      .andExpect(jsonPath("$.resolutionComment").value("ok"))
      .andExpect(jsonPath("$.transitions", hasSize<Any>(2)))
  }

  @Test
  fun `reviewing twice answers 409`() {
    val id = newAlert()
    send("POST", "/alerts/$id/review").andExpect(status().isOk)

    send("POST", "/alerts/$id/review").andExpect(status().isConflict)
  }

  @Test
  fun `a reviewed alert can be dismissed`() {
    val id = newAlert()
    send("POST", "/alerts/$id/review").andExpect(status().isOk)

    send("POST", "/alerts/$id/dismiss").andExpect(status().isOk).andExpect(jsonPath("$.status").value("descartada"))
  }

  @Test
  fun `an unknown alert answers 404`() {
    send("POST", "/alerts/999999999/review").andExpect(status().isNotFound)
    send("POST", "/alerts/999999999/resolve").andExpect(status().isNotFound)
    send("POST", "/alerts/999999999/dismiss").andExpect(status().isNotFound)
  }

  @Test
  fun `the comment is optional and the body too`() {
    val id = newAlert()

    send("POST", "/alerts/$id/review").andExpect(status().isOk)
    send("POST", "/alerts/$id/resolve", "{}").andExpect(status().isOk).andExpect(jsonPath("$.resolutionComment").doesNotExist())
  }

  @Test
  fun `a closed alert stays consultable and leaves the open ones`() {
    val plant = newPlant()
    val id = idOf(manualAlert(plant))
    send("POST", "/alerts/$id/resolve").andExpect(status().isOk)

    alertsPage("plant" to plant, "status" to "nueva", "status" to "revisada").andExpect(jsonPath("$.totalElements").value(0))
    alertsPage("plant" to plant, "status" to "resuelta").andExpect(jsonPath("$.totalElements").value(1))
    send("GET", "/alerts/$id").andExpect(status().isOk)
  }

  @Test
  fun `the closing instant comes from the clock`() {
    val id = newAlert()
    clock.advanceBy(Duration.ofHours(2))

    send("POST", "/alerts/$id/dismiss").andExpect(status().isOk)

    val closed = jdbcTemplate.queryForObject("SELECT closed_at FROM alert WHERE id = ?", java.sql.Timestamp::class.java, id.toLong())!!.toInstant()
    assertEquals(clock.instant(), closed)
  }
}

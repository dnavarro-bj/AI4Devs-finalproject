package com.cactify.alerts

import com.cactify.FakeCareAdvisor
import com.cactify.FakeCareAdvisorConfiguration
import com.cactify.MutableClockConfiguration
import com.cactify.application.ports.Advice
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.HttpStatus
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Escenarios de «Una recomendación de riesgo alto o medio origina o enriquece una alerta». El proveedor está doblado. */
@Import(MutableClockConfiguration::class, FakeCareAdvisorConfiguration::class)
class RecommendationAlertTest : AbstractAlertTest() {

  @Autowired
  lateinit var advisor: FakeCareAdvisor

  @BeforeEach
  fun reset() {
    advisor.reset()
  }

  private fun advice(risk: RiskLevel) {
    advisor.advice = Advice(risk, "La temperatura baja daña el cactus.", "Moverlo a un sitio más cálido", Priority.Soon)
  }

  private fun recommend(plant: String, recordId: String) =
    mockMvc.perform(post("/plants/$plant/care-records/$recordId/recommendation"))

  @Test
  fun `a high risk enriches the alert of the reading without touching source, status or severity`() {
    advice(RiskLevel.High)
    val plant = newPlant()
    val record = reading(plant, temperature = 8)

    recommend(plant, record.id).andExpect(status().isCreated)

    val alert = alertsOf(plant).single()
    assertEquals("medicion", alert["source"])
    assertEquals("nueva", alert["status"])
    assertEquals("baja", alert["severity"])
    assertEquals("Moverlo a un sitio más cálido", alert["recommended_action"])
    assertTrue((alert["reason"] as String).contains("La temperatura baja daña el cactus."))
  }

  @Test
  fun `a high risk on a reading without alert opens an AI alert`() {
    advice(RiskLevel.High)
    val plant = newPlant()
    val record = reading(plant, humidity = 20)

    recommend(plant, record.id).andExpect(status().isCreated)

    val alert = alertsOf(plant).single()
    assertEquals("recomendacion_ia", alert["source"])
    assertEquals("otra", alert["category"])
    assertEquals("critica", alert["severity"])
    assertEquals("Moverlo a un sitio más cálido", alert["recommended_action"])
    assertEquals(record.id, alert["care_record_id"].toString())
    assertEquals("nueva", transitionsOf(alert["id"]).single()["to_status"])
  }

  @Test
  fun `a medium risk opens a medium AI alert`() {
    advice(RiskLevel.Medium)
    val plant = newPlant()
    val record = reading(plant, humidity = 20)

    recommend(plant, record.id).andExpect(status().isCreated)

    assertEquals("media", alertsOf(plant).single()["severity"])
  }

  @Test
  fun `a low risk opens and changes nothing`() {
    advice(RiskLevel.Low)
    val plant = newPlant()
    val inRange = reading(plant, humidity = 20)
    val outOfRange = reading(plant, temperature = 8)
    val before = alertsOf(plant)

    recommend(plant, inRange.id).andExpect(status().isCreated)
    recommend(plant, outOfRange.id).andExpect(status().isCreated)

    assertEquals(before.single()["reason"], alertsOf(plant).single()["reason"])
    assertNull(alertsOf(plant).single()["recommended_action"])
  }

  @Test
  fun `asking for the recommendation again does not repeat the effect`() {
    advice(RiskLevel.High)
    val plant = newPlant()
    val record = reading(plant, humidity = 20)
    recommend(plant, record.id).andExpect(status().isCreated)

    recommend(plant, record.id).andExpect(status().isOk)

    assertEquals(1, advisor.callCount)
    assertEquals(1, alertsOf(plant).single()["occurrences"])
  }

  @Test
  fun `a failing provider answers 502 and the measurement alert stays`() {
    advisor.failure = { throw com.cactify.application.AIProviderException("caído") }
    val plant = newPlant()
    val record = reading(plant, temperature = 8)

    recommend(plant, record.id).andExpect(status().`is`(HttpStatus.BAD_GATEWAY.value()))

    val alerts = alertsOf(plant)
    assertEquals(listOf("medicion"), alerts.map { it["source"] })
  }

  @Test
  fun `listing the readings never creates or changes alerts`() {
    advice(RiskLevel.High)
    val plant = newPlant()
    reading(plant, humidity = 20)

    mockMvc.perform(get("/plants/$plant/care-records")).andExpect(status().isOk)

    assertTrue(alertsOf(plant).isEmpty())
  }

  @Test
  fun `an AI alert follows the duplicate rule`() {
    advice(RiskLevel.High)
    val plant = newPlant()
    val first = reading(plant, humidity = 20)
    val second = reading(plant, humidity = 21)

    recommend(plant, first.id).andExpect(status().isCreated)
    recommend(plant, second.id).andExpect(status().isCreated)

    val alert = alertsOf(plant).single()
    assertEquals(2, alert["occurrences"])
    assertEquals(second.id, alert["care_record_id"].toString())
  }
}

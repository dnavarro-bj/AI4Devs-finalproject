package com.cactify

import com.cactify.application.ports.Advice
import com.cactify.application.ports.AdviceRequest
import com.cactify.application.ports.CareAdvisor
import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary

/**
 * Doble del proveedor de análisis. Sustituye la llamada real siguiendo el patrón de
 * `MutableClockConfiguration`, sin librería de mocking: el proyecto no tiene ninguna y no la gana
 * aquí. Es también el punto de sustitución que usará el E2E de T-07 para correr sin red.
 */
class FakeCareAdvisor : CareAdvisor {

  /** Lo que devolverá la próxima llamada; si es `null`, se lanza [failure]. */
  var advice: Advice = Advice(
    riskLevel = RiskLevel.Low,
    explanation = "Todo dentro de rango",
    recommendedAction = "Mantener la pauta de riego",
    priority = Priority.Routine,
  )

  /** Si se fija, cada llamada lanza esto en lugar de responder. */
  var failure: (() -> Nothing)? = null

  /** Se ejecuta al recibir la petición, antes de responder. Útil para sincronizar hilos. */
  var onAdvise: (() -> Unit)? = null

  /** Las peticiones recibidas, para poder afirmar qué hechos se mandaron. */
  val received: MutableList<AdviceRequest> = mutableListOf()

  val callCount: Int get() = received.size

  override fun advise(request: AdviceRequest): Advice {
    synchronized(received) { received += request }
    onAdvise?.invoke()
    failure?.invoke()
    return advice
  }

  fun reset() {
    received.clear()
    failure = null
    onAdvise = null
  }
}

@TestConfiguration
class FakeCareAdvisorConfiguration {

  @Bean
  @Primary
  fun fakeCareAdvisor(): FakeCareAdvisor = FakeCareAdvisor()
}

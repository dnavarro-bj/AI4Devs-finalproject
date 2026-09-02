package com.cactify.application.ports

import com.cactify.domain.Priority
import com.cactify.domain.RiskLevel
import java.math.BigDecimal
import java.time.Instant

/**
 * Puerto del proveedor de análisis. Vive en `application` y no en `domain`: la IA es un colaborador
 * del caso de uso, no un concepto del modelo — una planta no sabe que existe una IA. ADR-006
 * descartó formalizar puertos en `domain` para cada integración externa, y esta es esa situación.
 *
 * Lo que viaja son **hechos ya resueltos**, no una cadena de prompt: quién los redacta es el
 * adaptador, y así un test puede afirmar qué datos se mandaron sin depender del fraseo.
 */
interface CareAdvisor {
  fun advise(request: AdviceRequest): Advice
}

data class AdviceRequest(
  val species: SpeciesFacts,
  val reading: ReadingFacts,
  /** Calculadas aquí contra los rangos de la especie: la IA interpreta, no decide los rangos. */
  val deviations: List<Deviation>,
  /** El último riego anterior o igual a la lectura analizada, o `null` si no consta ninguno. */
  val lastWatering: LastWatering?,
)

data class SpeciesFacts(
  val scientificName: String,
  val commonName: String,
  val humidityRange: IntRange,
  val temperatureRange: IntRange,
  val lightHoursRange: IntRange,
  val wateringGuideline: String,
)

data class ReadingFacts(
  val recordedAt: Instant,
  val humidity: Int?,
  val temperature: Int?,
  val lightHours: Int?,
  val waterAmountMl: Int?,
  val soilPh: BigDecimal?,
)

/** Una medida que se sale del rango de su especie, con cuánto se sale y hacia dónde. */
data class Deviation(
  val measurement: String,
  val value: String,
  val expectedRange: String,
  val direction: Direction,
) {
  enum class Direction { BELOW, ABOVE }
}

data class LastWatering(val amountMl: Int, val at: Instant)

data class Advice(
  val riskLevel: RiskLevel,
  val explanation: String,
  val recommendedAction: String,
  val priority: Priority,
)

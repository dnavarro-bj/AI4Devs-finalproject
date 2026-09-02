package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.math.BigDecimal
import java.time.Instant

/**
 * Lectura de cultivo tal como la expone el API. Los valores ausentes se omiten del JSON: `null` y
 * `0` significan cosas distintas en el riego, así que un valor vacío no puede llegar como cero.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class CareRecordResponse(
  val id: String,
  val plantId: String,
  val recordedAt: Instant,
  val humidity: Int?,
  val temperature: Int?,
  val lightHours: Int?,
  val waterAmountMl: Int?,
  val soilPh: BigDecimal?,
  /** La recomendación ya generada para esta lectura, o `null` si aún no tiene. Nunca se genera al leer. */
  val recommendation: CareRecordRecommendationResponse?,
)

data class CareRecordRecommendationResponse(
  val id: String,
  val riskLevel: String,
  val recommendationText: String,
)

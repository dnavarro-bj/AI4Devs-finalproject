package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.time.LocalDate

/**
 * Una alerta tal como la expone el API: la misma forma en la bandeja, en el detalle y en la ficha
 * del ejemplar. Lo ausente se omite. `resolvedAt` y `resolutionComment` solo existen si fue
 * **resuelta**: una descartada tiene `closedAt` y `closureComment` pero **no se presenta como resolución**.
 * El detalle añade [transitions] y [tasks].
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AlertResponse(
  val id: String,
  val source: String,
  val category: String,
  val severity: String,
  val status: String,
  val reason: String,
  val recommendedAction: String?,
  val detectedAt: Instant,
  val lastDetectedAt: Instant,
  val occurrences: Int,
  val resolvedAt: Instant?,
  val resolutionComment: String?,
  val closedAt: Instant?,
  val closureComment: String?,
  val careRecordId: String?,
  val plant: AlertPlantResponse?,
  val location: AlertLocationResponse?,
  val transitions: List<AlertTransitionResponse>? = null,
  val tasks: List<AlertTaskResponse>? = null,
)

/** La planta afectada, con lo que la tarjeta pinta: su código, su apodo, su especie y dónde está. */
data class AlertPlantResponse(
  val id: String,
  val code: String,
  val nickname: String,
  val speciesName: String,
  val locationName: String,
  val locationPath: String,
)

data class AlertLocationResponse(val id: String, val name: String, val path: String)

/** Un paso del historial. La apertura es la primera y no tiene `from`. */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AlertTransitionResponse(val from: String?, val to: String, val comment: String?, val occurredAt: Instant)

/** Una tarea que nació de la alerta. */
data class AlertTaskResponse(val id: String, val title: String, val status: String, val dueFrom: LocalDate, val dueTo: LocalDate)

/** Cuántas alertas abiertas hay y la mayor severidad entre ellas (ausente si no hay ninguna). */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AlertSummaryResponse(val count: Long, val highestSeverity: String?)

/** La alerta que completar una tarea propone resolver; resolverla es una llamada aparte. */
data class SuggestedAlertResolutionResponse(val alertId: String, val status: String)

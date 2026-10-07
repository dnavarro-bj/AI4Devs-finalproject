package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.time.LocalDate

/**
 * Una entrada de la cronología unificada: lo común —`id`, `type`, `occurredAt`, `batchId`— y **un**
 * objeto de detalle con el nombre del tipo; los demás van ausentes. El `id` es el de la lectura, el
 * cambio de estado, el movimiento o el evento, según el tipo.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelineEntryResponse(
  val id: String,
  val type: String,
  val occurredAt: Instant,
  val batchId: String? = null,
  val reading: CareRecordResponse? = null,
  val statusChange: TimelineStatusChangeResponse? = null,
  val movement: TimelineMovementResponse? = null,
  val comment: TimelineCommentResponse? = null,
  val intervention: TimelineInterventionResponse? = null,
  val bloom: TimelineBloomResponse? = null,
  val alert: TimelineAlertResponse? = null,
  val task: TimelineTaskResponse? = null,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelineStatusChangeResponse(val from: String, val to: String, val reason: String?)

data class TimelineMovementResponse(val from: MovementLocationResponse, val to: MovementLocationResponse)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelineCommentResponse(val text: String, val editedAt: Instant?)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelineInterventionResponse(
  val type: String,
  val product: String?,
  val potSize: String?,
  val soilMix: SoilMixSummaryResponse?,
  val notes: String?,
  /** La tarea que se completó al registrarla, si la hay. */
  val taskId: String? = null,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelineBloomResponse(
  val startedOn: LocalDate,
  val endedOn: LocalDate?,
  val status: String,
  val flowerCount: Int?,
  val notes: String?,
)

/** Una tarea completada, vista desde la historia de una planta: cuál fue y de qué tipo. */
data class TimelineTaskResponse(val taskId: String, val type: String, val title: String)

/**
 * Un paso del historial de una alerta del ejemplar: su apertura, revisión, resolución o descarte. La
 * entrada es **una por transición**; las ocurrencias posteriores no son eventos.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelineAlertResponse(
  val alertId: String,
  val category: String,
  val severity: String,
  val reason: String,
  val from: String?,
  val to: String,
  val comment: String?,
)

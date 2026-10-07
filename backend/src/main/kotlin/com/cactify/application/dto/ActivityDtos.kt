package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

/**
 * Una entrada de la actividad reciente: lo común —`id`, `type`, `occurredAt`— y **un** detalle con el
 * nombre del tipo; los demás van ausentes. El `id` es el del lote, la tarea o el evento.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ActivityEntryResponse(
  val id: String,
  val type: String,
  val occurredAt: Instant,
  val batch: ActivityBatchResponse? = null,
  val task: ActivityTaskResponse? = null,
  val plant: ActivityPlantResponse? = null,
  val comment: ActivityCommentResponse? = null,
  val intervention: ActivityInterventionResponse? = null,
)

data class ActivityBatchResponse(val id: String, val action: String, val plantCount: Int)
data class ActivityTaskResponse(val id: String, val type: String, val title: String, val affectedPlants: Int)
data class ActivityPlantResponse(val id: String, val code: String, val nickname: String)
data class ActivityCommentResponse(val excerpt: String)
data class ActivityInterventionResponse(val type: String)

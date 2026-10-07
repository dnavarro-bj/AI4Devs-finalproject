package com.cactify.application

import com.cactify.application.dto.CareRecordRecommendationResponse
import com.cactify.application.dto.CareRecordResponse
import com.cactify.application.dto.MovementLocationResponse
import com.cactify.application.dto.SoilMixSummaryResponse
import com.cactify.application.dto.TimelineAlertResponse
import com.cactify.application.dto.TimelineBloomResponse
import com.cactify.application.dto.TimelineCommentResponse
import com.cactify.application.dto.TimelineEntryResponse
import com.cactify.application.dto.TimelineInterventionResponse
import com.cactify.application.dto.TimelineMovementResponse
import com.cactify.application.dto.TimelineStatusChangeResponse
import com.cactify.application.dto.TimelineTaskResponse
import com.cactify.domain.AIRecommendation
import com.cactify.domain.AlertTransition
import com.cactify.domain.CareRecord
import com.cactify.domain.PlantBloom
import com.cactify.domain.PlantComment
import com.cactify.domain.PlantEvent
import com.cactify.domain.PlantIntervention
import com.cactify.domain.PlantMovement
import com.cactify.domain.PlantStatusChange
import com.cactify.domain.PlantTaskEvent
import com.cactify.domain.TimelineType

/**
 * Cómo cada fuente se convierte en una entrada de la cronología. Lo llaman el servicio de la
 * cronología y el de eventos, de modo que lo que devuelve un `POST` es **exactamente** lo que
 * después devuelve el listado.
 */
internal fun PlantEvent.toEntry(): TimelineEntryResponse {
  val base = TimelineEntryResponse(
    id = id.toString(),
    type = "",
    occurredAt = occurredAt,
    batchId = batch?.id?.toString(),
    batchSize = batch?.plantCount,
  )
  return when (this) {
    is PlantComment -> base.copy(
      type = TimelineType.Comment.value,
      comment = TimelineCommentResponse(text = text, editedAt = editedAt),
    )
    is PlantIntervention -> base.copy(
      type = TimelineType.Intervention.value,
      intervention = TimelineInterventionResponse(
        type = type.value,
        product = product,
        potSize = potSize,
        soilMix = soilMix?.let { SoilMixSummaryResponse(it.id.toString(), it.name) },
        notes = notes,
        taskId = task?.id?.toString(),
      ),
    )
    is PlantBloom -> base.copy(
      type = TimelineType.Bloom.value,
      bloom = TimelineBloomResponse(
        startedOn = startedOn,
        endedOn = endedOn,
        status = status.value,
        flowerCount = flowerCount,
        notes = notes,
      ),
    )
    is PlantTaskEvent -> base.copy(
      type = TimelineType.Task.value,
      task = TimelineTaskResponse(taskId = task.id.toString(), type = task.type.value, title = task.title),
    )
    else -> error("Tipo de evento sin entrada de cronología: ${this::class.simpleName}")
  }
}

internal fun AlertTransition.toEntry() = TimelineEntryResponse(
  id = id.toString(),
  type = TimelineType.Alert.value,
  occurredAt = occurredAt,
  alert = TimelineAlertResponse(
    alertId = alert.id.toString(),
    category = alert.category.value,
    severity = alert.severity.value,
    reason = alert.reason,
    from = fromStatus?.value,
    to = toStatus.value,
    comment = comment,
  ),
)

internal fun CareRecord.toEntry(recommendation: AIRecommendation?) = TimelineEntryResponse(
  id = id.toString(),
  type = TimelineType.Reading.value,
  occurredAt = recordedAt,
  batchId = batch?.id?.toString(),
  batchSize = batch?.plantCount,
  reading = CareRecordResponse(
    id = id.toString(),
    plantId = plant.id.toString(),
    recordedAt = recordedAt,
    humidity = humidity,
    temperature = temperature,
    lightHours = lightHours,
    waterAmountMl = waterAmountMl,
    soilPh = soilPh,
    recommendation = recommendation?.let {
      CareRecordRecommendationResponse(it.id.toString(), it.riskLevel.toString(), it.recommendationText)
    },
    taskId = task?.id?.toString(),
    batchId = batch?.id?.toString(),
  ),
)

internal fun PlantStatusChange.toEntry() = TimelineEntryResponse(
  id = id.toString(),
  type = TimelineType.StatusChange.value,
  occurredAt = occurredAt,
  statusChange = TimelineStatusChangeResponse(from = fromStatus.value, to = toStatus.value, reason = reason),
)

internal fun PlantMovement.toEntry() = TimelineEntryResponse(
  id = id.toString(),
  type = TimelineType.Movement.value,
  occurredAt = movedAt,
  movement = TimelineMovementResponse(
    from = MovementLocationResponse(fromLocation.id.toString(), fromLocation.name),
    to = MovementLocationResponse(toLocation.id.toString(), toLocation.name),
  ),
)

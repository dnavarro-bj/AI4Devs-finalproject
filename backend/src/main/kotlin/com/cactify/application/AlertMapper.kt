package com.cactify.application

import com.cactify.application.dto.AlertLocationResponse
import com.cactify.application.dto.AlertPlantResponse
import com.cactify.application.dto.AlertResponse
import com.cactify.application.dto.AlertTaskResponse
import com.cactify.application.dto.AlertTransitionResponse
import com.cactify.domain.Alert
import com.cactify.domain.AlertStatus
import com.cactify.domain.AlertTransition
import com.cactify.domain.Task
import com.cactify.domain.repos.LocationHierarchy
import org.springframework.stereotype.Component

/**
 * Cómo una alerta se convierte en su respuesta. Lo comparten la bandeja, el detalle y la ficha del
 * ejemplar, de modo que la misma alerta se ve igual en los tres sitios. Las rutas de las
 * localizaciones se piden **una vez** para todo el bloque (ADR-009).
 *
 * Debe llamarse dentro de la transacción: recorre la planta y la localización.
 */
@Component
class AlertMapper(private val hierarchy: LocationHierarchy) {

  fun toResponses(alerts: List<Alert>): List<AlertResponse> {
    val ids = alerts.flatMap { listOfNotNull(it.plant?.location?.id, it.location?.id) }.toSet()
    val paths = hierarchy.pathsOf(ids)
    return alerts.map { it.toResponse(paths) }
  }

  fun toDetail(alert: Alert, transitions: List<AlertTransition>, tasks: List<Task>): AlertResponse {
    val ids = listOfNotNull(alert.plant?.location?.id, alert.location?.id).toSet()
    return alert.toResponse(hierarchy.pathsOf(ids)).copy(
      transitions = transitions.map {
        AlertTransitionResponse(from = it.fromStatus?.value, to = it.toStatus.value, comment = it.comment, occurredAt = it.occurredAt)
      },
      tasks = tasks.map { AlertTaskResponse(it.id.toString(), it.title, it.status.value, it.dueFrom, it.dueTo) },
    )
  }

  private fun Alert.toResponse(paths: Map<com.cactify.domain.LocationId, String>): AlertResponse {
    val resolved = status == AlertStatus.Resolved
    return AlertResponse(
      id = id.toString(),
      source = source.value,
      category = category.value,
      severity = severity.value,
      status = status.value,
      reason = reason,
      recommendedAction = recommendedAction,
      detectedAt = detectedAt,
      lastDetectedAt = lastDetectedAt,
      occurrences = occurrences,
      resolvedAt = closedAt.takeIf { resolved },
      resolutionComment = closureComment.takeIf { resolved },
      closedAt = closedAt,
      closureComment = closureComment,
      careRecordId = careRecord?.id?.toString(),
      plant = plant?.let {
        AlertPlantResponse(
          id = it.id.toString(),
          code = it.code,
          nickname = it.nickname,
          speciesName = it.species.scientificName,
          locationName = it.location.name,
          locationPath = paths[it.location.id] ?: it.location.name,
        )
      },
      location = location?.let { AlertLocationResponse(it.id.toString(), it.name, paths[it.id] ?: it.name) },
    )
  }
}

package com.cactify.application

import com.cactify.application.dto.AlertResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.Alert
import com.cactify.domain.AlertCategory
import com.cactify.domain.AlertId
import com.cactify.domain.AlertSeverity
import com.cactify.domain.AlertSource
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.repos.AlertRepository
import com.cactify.domain.repos.AlertTransitionRepository
import com.cactify.domain.repos.LocationHierarchy
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.TaskRepository
import com.cactify.domain.specs.AlertSortKeys
import com.cactify.domain.specs.AlertSpecs
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/** El cuerpo de una alerta anotada a mano: sobre **una** planta o **una** localización. */
data class CreateAlertRequest(
  val plantId: String? = null,
  val locationId: String? = null,
  val category: String,
  val severity: String,
  val reason: String,
  val recommendedAction: String? = null,
)

/** Revisar, resolver y descartar: el comentario es opcional y el cuerpo entero también. */
data class AlertCommentRequest(val comment: String? = null)

/**
 * Casos de uso de las alertas: consultarlas, anotarlas a mano y recorrer su ciclo de vida. Las
 * abre solas [AlertDetectionService]; **cerrarlas es siempre una persona**. El mapeo a DTO ocurre
 * **dentro** de la transacción (`open-in-view` apagado).
 */
@Service
class AlertService(
  private val alertRepository: AlertRepository,
  private val transitionRepository: AlertTransitionRepository,
  private val plantRepository: PlantRepository,
  private val locationRepository: LocationRepository,
  private val taskRepository: TaskRepository,
  private val hierarchy: LocationHierarchy,
  private val mapper: AlertMapper,
  private val clock: Clock,
) {

  @Transactional(readOnly = true)
  fun search(criteria: AlertCriteria, pageable: Pageable): PageResponse<AlertResponse> {
    val page = alertRepository.findAll(specification(criteria), AlertSortKeys.translate(pageable))
    val responses = mapper.toResponses(page.content)
    return PageResponse(responses, page.totalElements, page.totalPages, page.number, page.size)
  }

  @Transactional(readOnly = true)
  fun findById(id: String): AlertResponse = toDetail(requireAlert(id))

  /** Una incidencia anotada a mano. Una referencia inexistente del cuerpo es `400`, no `404`. */
  @Transactional
  fun create(request: CreateAlertRequest): AlertResponse {
    require((request.plantId != null) != (request.locationId != null)) {
      "Una alerta afecta a una planta o a una localización, no a las dos ni a ninguna"
    }
    val plant = request.plantId?.let {
      plantRepository.findOneById(PlantId.from(it)) ?: throw InvalidReferenceException("La planta", it)
    }
    val location = request.locationId?.let {
      locationRepository.findOneById(LocationId.from(it)) ?: throw InvalidReferenceException("La localización", it)
    }
    val opened = Alert.open(
      plant = plant,
      location = location,
      source = AlertSource.Manual,
      category = AlertCategory(request.category),
      severity = AlertSeverity(request.severity),
      reason = request.reason,
      recommendedAction = request.recommendedAction,
      careRecord = null,
      clock = clock,
    )
    alertRepository.save(opened.alert)
    transitionRepository.save(opened.transition)
    return toDetail(opened.alert)
  }

  @Transactional
  fun review(id: String, request: AlertCommentRequest?): AlertResponse = move(id) { it.review(request?.comment, clock) }

  @Transactional
  fun resolve(id: String, request: AlertCommentRequest?): AlertResponse = move(id) { it.resolve(request?.comment, clock) }

  @Transactional
  fun dismiss(id: String, request: AlertCommentRequest?): AlertResponse = move(id) { it.dismiss(request?.comment, clock) }

  /** Con la fila bloqueada: dos cierres simultáneos dejan uno y el otro recibe `409`. */
  private fun move(id: String, action: (Alert) -> com.cactify.domain.AlertTransition): AlertResponse {
    val alert = alertRepository.findOneByIdForUpdate(AlertId.from(id)) ?: throw AlertNotFoundException(id)
    transitionRepository.save(action(alert))
    return toDetail(alert)
  }

  private fun requireAlert(id: String): Alert =
    alertRepository.findOneById(AlertId.from(id)) ?: throw AlertNotFoundException(id)

  private fun toDetail(alert: Alert): AlertResponse = mapper.toDetail(
    alert,
    transitionRepository.findAllByAlertId(alert.id),
    taskRepository.findByOriginAlertId(alert.id, PageRequest.of(0, MAX_TASKS, org.springframework.data.domain.Sort.by("createdAt"))).content,
  )

  /** Los criterios del listado como una especificación. Debe llamarse dentro de una transacción: con descendientes consulta la jerarquía. */
  private fun specification(criteria: AlertCriteria) = AlertSpecs.byStatuses(criteria.statuses)
    .and(AlertSpecs.bySeverities(criteria.severities))
    .and(AlertSpecs.bySource(criteria.source))
    .and(AlertSpecs.byCategory(criteria.category))
    .and(AlertSpecs.byPlant(criteria.plantId))
    .and(
      criteria.locationId?.let { id ->
        AlertSpecs.byLocations(if (criteria.includeDescendants) hierarchy.subtreeIds(id) else setOf(id))
      },
    )

  private companion object {
    /** Tope de tareas en el detalle de una alerta: acotado por naturaleza, y ADR-009 pide un límite. */
    const val MAX_TASKS = 100
  }
}

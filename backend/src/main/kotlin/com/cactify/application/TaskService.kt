package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SpeciesSummaryResponse
import com.cactify.application.dto.SuggestedAlertResolutionResponse
import com.cactify.application.dto.TaskCompletionResponse
import com.cactify.application.dto.TaskLocationResponse
import com.cactify.application.dto.TaskPlantResponse
import com.cactify.application.dto.TaskResponse
import com.cactify.application.dto.TaskScopePlantResponse
import com.cactify.application.dto.TaskTargetResponse
import com.cactify.domain.Alert
import com.cactify.domain.AlertId
import com.cactify.domain.CareRecord
import com.cactify.domain.InterventionType
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.PlantIntervention
import com.cactify.domain.PlantStatus
import com.cactify.domain.PlantTaskEvent
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.Task
import com.cactify.domain.TaskId
import com.cactify.domain.TaskPriority
import com.cactify.domain.TaskStatus
import com.cactify.domain.TaskTarget
import com.cactify.domain.TaskType
import com.cactify.domain.repos.AlertRepository
import com.cactify.domain.repos.CareRecordRepository
import com.cactify.domain.repos.LocationHierarchy
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantEventRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.TaskRepository
import com.cactify.domain.specs.PlantSpecs
import com.cactify.domain.specs.TaskSortKeys
import com.cactify.domain.specs.TaskSpecs
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate

/** El cuerpo de alta y de reemplazo de una tarea: es el mismo, porque el reemplazo es completo. */
data class TaskRequest(
  val type: String,
  val title: String,
  val priority: String? = null,
  val dueFrom: LocalDate,
  /** Sin fin, la tarea es de un solo día: `dueTo` vale lo mismo que `dueFrom`. */
  val dueTo: LocalDate? = null,
  val notes: String? = null,
  /** El destino es una localización **o** unas plantas, nunca las dos ni ninguna. */
  val locationId: String? = null,
  val plantIds: List<String>? = null,
  /** La alerta de la que nace la tarea; solo se admite al crear (un reemplazo no cambia el origen). */
  val originAlertId: String? = null,
)

/** Reprogramar cambia solo el periodo. */
data class ScheduleRequest(val dueFrom: LocalDate, val dueTo: LocalDate? = null)

/** Omitir y cancelar: el motivo es opcional y el cuerpo entero también. */
data class CloseTaskRequest(val reason: String? = null)

/** Una lectura de cultivo registrada al completar: las mismas medidas que el alta directa. */
data class ReadingInput(
  val humidity: Int? = null,
  val temperature: Int? = null,
  val lightHours: Int? = null,
  val waterAmountMl: Int? = null,
  val soilPh: BigDecimal? = null,
)

/** Una intervención registrada al completar: su tipo y los datos que ese tipo admite. */
data class InterventionInput(
  val type: String,
  val product: String? = null,
  val potSize: String? = null,
  val soilMixId: String? = null,
  val notes: String? = null,
)

/**
 * Completar una tarea. Solo lleva las **exclusiones**, no la lista de incluidas: así una planta que
 * llegó entre el diálogo y la confirmación no se queda sin su evento. El registro opcional se aplica
 * **igual a cada planta incluida**.
 */
data class CompleteTaskRequest(
  val completedAt: Instant? = null,
  val excludedPlantIds: List<String>? = null,
  val reading: ReadingInput? = null,
  val intervention: InterventionInput? = null,
)

/**
 * Casos de uso de las tareas. Como en el resto de servicios, el mapeo a DTO ocurre **dentro** de la
 * transacción (`open-in-view` apagado).
 *
 * Una tarea es una intención: crearla, editarla, omitirla o cancelarla no escribe nada en las plantas.
 * Completarla escribe, en **una sola transacción** y con la fila de la tarea bloqueada, un evento
 * `tarea` por planta incluida y, si se pide, el hecho concreto enlazado a la tarea.
 */
@Service
class TaskService(
  private val taskRepository: TaskRepository,
  private val plantRepository: PlantRepository,
  private val locationRepository: LocationRepository,
  private val hierarchy: LocationHierarchy,
  private val eventRepository: PlantEventRepository,
  private val careRecordRepository: CareRecordRepository,
  private val soilMixRepository: SoilMixRepository,
  private val alertRepository: AlertRepository,
  private val clock: Clock,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) {

  // ---- Alta, consulta y edición ----

  @Transactional
  fun create(request: TaskRequest): TaskResponse {
    val task = Task.create(
      type = TaskType(request.type),
      title = request.title,
      priority = priorityOf(request),
      dueFrom = request.dueFrom,
      dueTo = request.dueTo ?: request.dueFrom,
      notes = request.notes,
      target = resolveTarget(request),
      originAlert = request.originAlertId?.let { resolveAlert(it) },
    )
    return toDetail(taskRepository.save(task))
  }

  @Transactional(readOnly = true)
  fun findById(id: String): TaskResponse = toDetail(requireTask(id))

  /** Reemplazo completo de una tarea pendiente; una tarea cerrada es `409`. */
  @Transactional
  fun update(id: String, request: TaskRequest): TaskResponse {
    val task = requireTask(id)
    task.replace(
      type = TaskType(request.type),
      title = request.title,
      priority = priorityOf(request),
      dueFrom = request.dueFrom,
      dueTo = request.dueTo ?: request.dueFrom,
      notes = request.notes,
      target = resolveTarget(request),
    )
    return toDetail(task)
  }

  @Transactional
  fun reschedule(id: String, request: ScheduleRequest): TaskResponse {
    val task = requireTask(id)
    task.reschedule(request.dueFrom, request.dueTo ?: request.dueFrom)
    return toDetail(task)
  }

  // ---- Listado y alcance ----

  /** Pendientes por defecto, ordenadas por periodo. El orden se pide con claves públicas (ADR-016). */
  @Transactional(readOnly = true)
  fun search(criteria: TaskCriteria, pageable: Pageable): PageResponse<TaskResponse> {
    val page = taskRepository.findAll(specification(criteria), TaskSortKeys.translate(pageable))
    val paths = pathsOf(page.content)
    val counts = taskRepository.countPlantsByTaskIds(page.content.filter { it.location == null }.map { it.id })
      .associate { it.taskId to it.plants }
    return PageResponse.of(page) { it.toResponse(paths, counts[it.id]?.toInt() ?: 0, detail = false) }
  }

  /** Las plantas que la tarea afectaría **ahora**, paginadas y por código: lo que el diálogo de completar muestra. */
  @Transactional(readOnly = true)
  fun scope(id: String, pageable: Pageable): PageResponse<TaskScopePlantResponse> {
    val task = requireTask(id)
    val page = plantRepository.findAll(
      PlantSpecs.withSpeciesAndLocation().and(scopeSpecification(task)),
      PageRequest.of(pageable.pageNumber, pageable.pageSize, Sort.by("code")),
    )
    val paths = hierarchy.pathsOf(page.content.map { it.location.id }.toSet())
    return PageResponse.of(page) {
      TaskScopePlantResponse(
        id = it.id.toString(),
        code = it.code,
        nickname = it.nickname,
        species = SpeciesSummaryResponse(it.species.id.toString(), it.species.code, it.species.scientificName, it.species.commonName),
        location = TaskLocationResponse(it.location.id.toString(), it.location.name, paths[it.location.id] ?: it.location.name),
      )
    }
  }

  // ---- Cierre ----

  /**
   * Completar. El alcance es **el de este instante** y se calcula con el mismo código que
   * [scope]; las exclusiones salen de él; y todo —los eventos, los registros y el cierre de la tarea—
   * ocurre en esta transacción con la fila bloqueada: dos finalizaciones simultáneas dejan una, y un
   * fallo a medias no deja ni la tarea completada ni un evento suelto.
   */
  @Transactional
  fun complete(id: String, request: CompleteTaskRequest): TaskResponse {
    val task = taskRepository.findOneByIdForUpdate(TaskId.from(id)) ?: throw TaskNotFoundException(id)
    if (task.status.isClosed) throw com.cactify.domain.TaskNotPendingException(task.status)

    val completedAt = PlantTaskEvent.stampCompletion(request.completedAt, clock, maxFutureSkew)
    val inScope = scopePlantIds(task)
    val excluded = request.excludedPlantIds.orEmpty().map { PlantId.from(it) }.toSet()
    val alien = excluded - inScope.toSet()
    require(alien.isEmpty()) { "Las plantas ${alien.joinToString()} no están en el alcance de la tarea y no se pueden excluir" }
    val included = inScope.filter { it !in excluded }
    require(included.isNotEmpty()) { "La tarea no afectaría a ninguna planta: no se puede completar sin plantas incluidas" }
    val mix = request.intervention?.soilMixId?.let { resolveMix(it) }
    // El mismo registro va a todas las plantas: si es válido para la primera, lo es para todas. Se
    // prueba antes de escribir nada, de modo que un registro inválido no deja ni un evento.
    plantRepository.findAllWithLocationByIdIn(listOf(included.first())).firstOrNull()?.let { sample ->
      request.reading?.toRecord(sample, completedAt, task)
      request.intervention?.toIntervention(sample, mix, completedAt, task)
    }

    included.chunked(CHUNK).forEach { chunk ->
      plantRepository.findAllWithLocationByIdIn(chunk).forEach { plant ->
        eventRepository.save(PlantTaskEvent.record(plant, task, completedAt, clock, maxFutureSkew))
        request.reading?.let { careRecordRepository.save(it.toRecord(plant, completedAt, task)) }
        request.intervention?.let { eventRepository.save(it.toIntervention(plant, mix, completedAt, task)) }
      }
    }
    task.complete(completedAt, included.size)
    // Completar PROPONE resolver la alerta de origen, si sigue abierta; nunca la resuelve ni la oculta.
    val suggestion = task.originAlert?.takeIf { it.status.isOpen }
      ?.let { SuggestedAlertResolutionResponse(it.id.toString(), it.status.value) }
    return toDetail(task).copy(suggestedAlertResolution = suggestion)
  }

  @Transactional
  fun skip(id: String, request: CloseTaskRequest?): TaskResponse = close(id) { it.skip(request?.reason) }

  @Transactional
  fun cancel(id: String, request: CloseTaskRequest?): TaskResponse = close(id) { it.cancel(request?.reason) }

  private fun close(id: String, action: (Task) -> Unit): TaskResponse {
    val task = requireTask(id)
    action(task)
    return toDetail(task)
  }

  // ---- Soporte ----

  private fun requireTask(id: String): Task =
    taskRepository.findOneById(TaskId.from(id)) ?: throw TaskNotFoundException(id)

  private fun priorityOf(request: TaskRequest) = request.priority?.let { TaskPriority(it) } ?: TaskPriority.Normal

  /** El destino del cuerpo: una localización o unas plantas. Una referencia inexistente es un `400`, no un `404`. */
  private fun resolveTarget(request: TaskRequest): TaskTarget {
    val plantIds = request.plantIds.orEmpty().map { it.trim() }.distinct()
    require((request.locationId != null) != plantIds.isNotEmpty()) {
      "El destino de una tarea es una localización o unas plantas: ni las dos cosas ni ninguna"
    }
    request.locationId?.let { id ->
      val location = locationRepository.findOneById(LocationId.from(id)) ?: throw InvalidReferenceException("La localización", id)
      return TaskTarget.Location(location)
    }
    require(plantIds.size <= TaskTarget.Plants.MAX_PLANTS) {
      "Una tarea no puede nombrar más de ${TaskTarget.Plants.MAX_PLANTS} plantas; para más, dirígela a una localización"
    }
    val ids = plantIds.map { PlantId.from(it) }
    val found = plantRepository.findAllWithLocationByIdIn(ids).associateBy { it.id }
    ids.firstOrNull { it !in found }?.let { throw InvalidReferenceException("La planta", it.toString()) }
    found.values.firstOrNull { it.status.isFinal }?.let {
      throw IllegalArgumentException("La planta '${it.code}' está archivada (${it.status}) y no puede ser destino de una tarea")
    }
    return TaskTarget.Plants(found.values.toSet())
  }

  /** Una alerta que no existe es una referencia errónea del cuerpo (`400`); una cerrada, un conflicto de estado (`409`). */
  private fun resolveAlert(id: String): Alert {
    val alert = alertRepository.findOneById(AlertId.from(id)) ?: throw InvalidReferenceException("La alerta", id)
    if (!alert.status.isOpen) throw AlertClosedException(id)
    return alert
  }

  private fun resolveMix(id: String): SoilMix =
    soilMixRepository.findOneById(SoilMixId.from(id)) ?: throw InvalidReferenceException("La mezcla de tierra", id)

  /** Los criterios del listado como una especificación. Debe llamarse dentro de una transacción: consulta la jerarquía. */
  private fun specification(criteria: TaskCriteria): Specification<Task> {
    val today = criteria.today ?: LocalDate.now(clock)
    var spec = TaskSpecs.byStatuses(criteria.statuses.ifEmpty { setOf(TaskStatus.Pending) })
      .and(TaskSpecs.byTypes(criteria.types))
      .and(TaskSpecs.byPriorities(criteria.priorities))
      .and(TaskSpecs.byTitleContaining(criteria.text))
      .and(TaskSpecs.overlapping(criteria.from, criteria.to))
      .and(TaskSpecs.bySpecies(criteria.speciesIds))
      .and(TaskSpecs.byAlert(criteria.alertId))
    when (criteria.due) {
      TaskCriteria.Due.Overdue -> spec = spec.and(TaskSpecs.overdue(today))
      TaskCriteria.Due.Today -> spec = spec.and(TaskSpecs.dueOn(today))
      null -> Unit
    }
    criteria.locationId?.let { id ->
      spec = spec.and(TaskSpecs.byLocations(if (criteria.includeDescendants) hierarchy.subtreeIds(id) else setOf(id)))
    }
    criteria.plantId?.let { id ->
      val plant = plantRepository.findOneById(id)
      spec = spec.and(
        if (plant == null) {
          TaskSpecs.byLocations(emptySet())
        } else {
          TaskSpecs.affectingPlant(id, hierarchy.ancestorsOf(plant.location.id).map { it.id }.toSet() + plant.location.id)
        },
      )
    }
    return spec
  }

  /** Las plantas **en curso** que la tarea afecta ahora: las expresas, o las de la localización y sus sublocalizaciones. */
  private fun scopeSpecification(task: Task): Specification<Plant> {
    val target = task.location?.let { PlantSpecs.byLocations(hierarchy.subtreeIds(it.id)) }
      ?: PlantSpecs.byIds(task.plants.map { it.id }.toSet())
    return PlantSpecs.byStatuses(PlantStatus.inProgress).and(target)
  }

  /** Todos los identificadores del alcance, por código: el mismo recorrido que [scope], sin cargar las plantas. */
  private fun scopePlantIds(task: Task): List<PlantId> {
    val spec = scopeSpecification(task)
    val ids = mutableListOf<PlantId>()
    var page = 0
    do {
      val result = plantRepository.findAll(spec, PageRequest.of(page++, SCOPE_PAGE, Sort.by("code")))
      ids += result.content.map { it.id }
    } while (result.hasNext())
    return ids
  }

  private fun pathsOf(tasks: Collection<Task>): Map<LocationId, String> =
    hierarchy.pathsOf(tasks.mapNotNull { it.location?.id }.toSet())

  private fun toDetail(task: Task): TaskResponse = task.toResponse(pathsOf(listOf(task)), task.plants.size, detail = true)

  private fun Task.toResponse(paths: Map<LocationId, String>, plantCount: Int, detail: Boolean) = TaskResponse(
    id = id.toString(),
    type = type.value,
    title = title,
    priority = priority.value,
    status = status.value,
    dueFrom = dueFrom,
    dueTo = dueTo,
    notes = notes,
    origin = origin.value,
    target = location?.let { it.toTarget(paths) } ?: TaskTargetResponse(
      kind = "plants",
      plantCount = plantCount,
      plants = if (detail) plants.sortedBy { it.code }.map { TaskPlantResponse(it.id.toString(), it.code, it.nickname) } else null,
    ),
    completion = completedAt?.let { TaskCompletionResponse(it, affectedPlants ?: 0) },
    closedReason = closedReason,
    createdAt = createdAt,
    updatedAt = updatedAt,
    originAlertId = originAlert?.id?.toString(),
  )

  private fun Location.toTarget(paths: Map<LocationId, String>) =
    TaskTargetResponse(kind = "location", location = TaskLocationResponse(id.toString(), name, paths[id] ?: name))

  private fun ReadingInput.toRecord(plant: Plant, at: Instant, task: Task) = CareRecord.record(
    plant = plant,
    humidity = humidity,
    temperature = temperature,
    lightHours = lightHours,
    waterAmountMl = waterAmountMl,
    soilPh = soilPh,
    recordedAt = at,
    clock = clock,
    maxFutureSkew = maxFutureSkew,
    task = task,
  )

  private fun InterventionInput.toIntervention(plant: Plant, mix: SoilMix?, at: Instant, task: Task) = PlantIntervention.record(
    plant, InterventionType(type), product, potSize, mix, notes, at, clock, maxFutureSkew, task,
  )

  private companion object {
    /** Plantas por bloque al completar. */
    const val CHUNK = 100

    /** Tamaño de página al recorrer el alcance entero. */
    const val SCOPE_PAGE = 500
  }
}

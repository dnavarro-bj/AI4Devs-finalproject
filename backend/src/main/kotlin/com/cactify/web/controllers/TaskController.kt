package com.cactify.web.controllers

import com.cactify.application.CloseTaskRequest
import com.cactify.application.CompleteTaskRequest
import com.cactify.application.ScheduleRequest
import com.cactify.application.TaskCriteria
import com.cactify.application.TaskRequest
import com.cactify.application.TaskService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TaskResponse
import com.cactify.application.dto.TaskScopePlantResponse
import org.springframework.data.domain.Pageable
import org.springframework.data.web.SortDefault
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/tasks")
class TaskController(private val taskService: TaskService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@RequestBody request: TaskRequest): TaskResponse = taskService.create(request)

  /**
   * Los filtros se combinan con `AND`; `status`, `type`, `priority` y `species` son repetibles (cualquiera
   * de los valores). Sin `status`, solo las pendientes. `today` es el día del cliente para `due`: sin él,
   * el del reloj del servidor en UTC.
   */
  @GetMapping
  fun list(
    @RequestParam(name = "status", required = false) statuses: List<String>?,
    @RequestParam(name = "type", required = false) types: List<String>?,
    @RequestParam(name = "priority", required = false) priorities: List<String>?,
    /** Coincidencia parcial sobre el título, sin distinguir mayúsculas. */
    @RequestParam(name = "q", required = false) text: String?,
    /** Las tareas cuyo periodo se solapa con `[from, to]`; cada extremo es opcional. */
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) from: LocalDate?,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) to: LocalDate?,
    /** `overdue` (pendientes cuyo fin ya pasó) o `today` (pendientes cuyo periodo contiene hoy). */
    @RequestParam(required = false) due: String?,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) today: LocalDate?,
    /** Tareas dirigidas a esa localización o a plantas que están en ella; con `includeDescendants`, también su subárbol. */
    @RequestParam(required = false) location: String?,
    @RequestParam(required = false, defaultValue = "false") includeDescendants: Boolean,
    /** Tareas que afectan a esa planta: la nombran, o apuntan a su localización o a un ascendiente. */
    @RequestParam(required = false) plant: String?,
    @RequestParam(name = "species", required = false) species: List<String>?,
    @SortDefault(sort = ["due"]) pageable: Pageable,
  ): PageResponse<TaskResponse> = taskService.search(
    TaskCriteria(
      statuses = statuses.orEmpty(),
      types = types.orEmpty(),
      priorities = priorities.orEmpty(),
      text = text,
      from = from,
      to = to,
      due = due,
      today = today,
      location = location,
      includeDescendants = includeDescendants,
      plant = plant,
      species = species.orEmpty(),
    ),
    pageable,
  )

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): TaskResponse = taskService.findById(id)

  /** Reemplazo completo de una tarea pendiente. */
  @PutMapping("/{id}")
  fun update(@PathVariable id: String, @RequestBody request: TaskRequest): TaskResponse = taskService.update(id, request)

  @PutMapping("/{id}/schedule")
  fun reschedule(@PathVariable id: String, @RequestBody request: ScheduleRequest): TaskResponse =
    taskService.reschedule(id, request)

  /** Las plantas que la tarea afectaría ahora, paginadas y por código. */
  @GetMapping("/{id}/scope")
  fun scope(@PathVariable id: String, pageable: Pageable): PageResponse<TaskScopePlantResponse> =
    taskService.scope(id, pageable)

  @PostMapping("/{id}/complete")
  fun complete(
    @PathVariable id: String,
    @RequestBody(required = false) request: CompleteTaskRequest?,
  ): TaskResponse = taskService.complete(id, request ?: CompleteTaskRequest())

  @PostMapping("/{id}/skip")
  fun skip(@PathVariable id: String, @RequestBody(required = false) request: CloseTaskRequest?): TaskResponse =
    taskService.skip(id, request)

  @PostMapping("/{id}/cancel")
  fun cancel(@PathVariable id: String, @RequestBody(required = false) request: CloseTaskRequest?): TaskResponse =
    taskService.cancel(id, request)
}

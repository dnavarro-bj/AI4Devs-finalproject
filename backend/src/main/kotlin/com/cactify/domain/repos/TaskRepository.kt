package com.cactify.domain.repos

import com.cactify.domain.LocationId
import com.cactify.domain.Task
import com.cactify.domain.TaskId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification

/** Cuántas plantas expresas nombra una tarea: para resolver el destino de una página en **una** consulta. */
data class TaskPlantCount(val taskId: TaskId, val plants: Long)

/**
 * Puerto de acceso a tareas. El listado solo existe filtrado y paginado: no hay `findAll()` sin
 * límite (ADR-009).
 */
interface TaskRepository {
  fun save(task: Task): Task
  fun findOneById(id: TaskId): Task?

  /** La tarea con su fila **bloqueada** hasta el final de la transacción: serializa dos finalizaciones simultáneas. */
  fun findOneByIdForUpdate(id: TaskId): Task?
  fun findAll(spec: Specification<Task>?, pageable: Pageable): Page<Task>

  /** Si alguna tarea, en cualquier estado, apunta a esa localización: sostiene el `409` al retirarla. */
  fun existsByLocationId(locationId: LocationId): Boolean

  /** Cuántas plantas expresas tiene cada tarea de un bloque, en **una** consulta. */
  fun countPlantsByTaskIds(ids: Collection<TaskId>): List<TaskPlantCount>
}

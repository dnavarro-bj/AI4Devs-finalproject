package com.cactify.application

import com.cactify.domain.AlertId
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.SpeciesId
import com.cactify.domain.TaskPriority
import com.cactify.domain.TaskStatus
import com.cactify.domain.TaskType
import java.time.LocalDate

/**
 * Los criterios del listado de tareas, ya interpretados (ADR-016). Se validan **al construirse**: un
 * valor que el listado no puede servir es un `IllegalArgumentException` —un `400`— y nunca llega a la
 * consulta. Un criterio vacío no filtra.
 *
 * `today` es la fecha que declara el cliente para «vencida» y «hoy»: el servidor no conoce el día del
 * usuario. Si falta, el servicio usa la fecha de su reloj en UTC.
 */
class TaskCriteria(
  statuses: List<String> = emptyList(),
  types: List<String> = emptyList(),
  priorities: List<String> = emptyList(),
  val text: String? = null,
  val from: LocalDate? = null,
  val to: LocalDate? = null,
  due: String? = null,
  val today: LocalDate? = null,
  location: String? = null,
  val includeDescendants: Boolean = false,
  plant: String? = null,
  species: List<String> = emptyList(),
  alert: String? = null,
) {
  val statuses: Set<TaskStatus> = statuses.map { TaskStatus(it) }.toSet()
  val types: Set<TaskType> = types.map { TaskType(it) }.toSet()
  val priorities: Set<TaskPriority> = priorities.map { TaskPriority(it) }.toSet()
  val locationId: LocationId? = location?.takeIf { it.isNotBlank() }?.let { LocationId.from(it) }
  val plantId: PlantId? = plant?.takeIf { it.isNotBlank() }?.let { PlantId.from(it) }
  val alertId: AlertId? = alert?.takeIf { it.isNotBlank() }?.let { AlertId.from(it) }
  val speciesIds: Set<SpeciesId> = species.map { SpeciesId.from(it) }.toSet()
  val due: Due? = due?.takeIf { it.isNotBlank() }?.let { Due(it) }

  /** Qué parte del tiempo se pide: lo vencido o lo de hoy. Un valor distinto es un `400`. */
  enum class Due(val value: String) {
    Overdue("overdue"),
    Today("today"),
    ;

    companion object {
      operator fun invoke(value: String): Due =
        entries.find { it.value == value.trim().lowercase() }
          ?: throw IllegalArgumentException("'$value' no es un valor de 'due' válido: ${entries.joinToString { it.value }}")
    }
  }
}

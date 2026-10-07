package com.cactify.domain.specs

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.SpeciesId
import com.cactify.domain.Species
import com.cactify.domain.Task
import com.cactify.domain.TaskPriority
import com.cactify.domain.TaskStatus
import com.cactify.domain.TaskType
import org.springframework.data.jpa.domain.Specification
import java.time.LocalDate

/**
 * Filtros del listado de tareas como piezas nombradas y componibles, con la convención de
 * [PlantSpecs]: cada factoría devuelve `null` cuando su filtro no aplica.
 *
 * «Vencida» no es una columna: es una condición sobre el estado y la fecha, así que [overdue] y
 * [dueOn] reciben la fecha de referencia y componen con el resto como cualquier otro filtro.
 */
object TaskSpecs {

  fun byStatuses(statuses: Set<TaskStatus>): Specification<Task> =
    Specification { root, _, _ -> if (statuses.isEmpty()) null else root.get<TaskStatus>("status").`in`(statuses) }

  fun byTypes(types: Set<TaskType>): Specification<Task> =
    Specification { root, _, _ -> if (types.isEmpty()) null else root.get<TaskType>("type").`in`(types) }

  fun byPriorities(priorities: Set<TaskPriority>): Specification<Task> =
    Specification { root, _, _ -> if (priorities.isEmpty()) null else root.get<TaskPriority>("priority").`in`(priorities) }

  /** Coincidencia parcial sobre el título, sin distinguir mayúsculas; el texto es literal (ver [LikePattern]). */
  fun byTitleContaining(text: String?): Specification<Task> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) {
        null
      } else {
        cb.like(cb.upper(root.get("title")), LikePattern.contains(needle.uppercase()), LikePattern.ESCAPE)
      }
    }

  /** Las tareas cuyo periodo **se solapa** con el intervalo; cada extremo es opcional. */
  fun overlapping(from: LocalDate?, to: LocalDate?): Specification<Task> =
    Specification { root, _, cb ->
      val conditions = listOfNotNull(
        from?.let { cb.greaterThanOrEqualTo(root.get<LocalDate>("dueTo"), it) },
        to?.let { cb.lessThanOrEqualTo(root.get<LocalDate>("dueFrom"), it) },
      )
      if (conditions.isEmpty()) null else cb.and(*conditions.toTypedArray())
    }

  /** Pendiente y con el fin del periodo anterior a [today]. Lo cerrado no vence nunca. */
  fun overdue(today: LocalDate): Specification<Task> =
    Specification { root, _, cb ->
      cb.and(cb.equal(root.get<TaskStatus>("status"), TaskStatus.Pending), cb.lessThan(root.get<LocalDate>("dueTo"), today))
    }

  /** Pendiente y con [today] dentro del periodo, extremos incluidos. */
  fun dueOn(today: LocalDate): Specification<Task> =
    Specification { root, _, cb ->
      cb.and(
        cb.equal(root.get<TaskStatus>("status"), TaskStatus.Pending),
        cb.lessThanOrEqualTo(root.get<LocalDate>("dueFrom"), today),
        cb.greaterThanOrEqualTo(root.get<LocalDate>("dueTo"), today),
      )
    }

  /**
   * Las tareas dirigidas a **cualquiera** de esas localizaciones **o** a plantas expresas que estén
   * ahora en alguna de ellas: es «el trabajo de este sitio». Un conjunto vacío no admite nada: es una
   * localización que no existe, no un filtro ausente.
   */
  fun byLocations(locationIds: Set<LocationId>): Specification<Task> =
    Specification { root, query, cb ->
      if (locationIds.isEmpty()) {
        cb.disjunction()
      } else {
        cb.or(
          locationId(root).`in`(locationIds),
          hasPlant(root, query!!, cb) { plant -> plant.get<Location>("location").get<LocationId>("id").`in`(locationIds) },
        )
      }
    }

  /**
   * Las tareas que afectan a una planta: la nombran expresamente, o apuntan a la localización donde
   * está o a cualquiera de sus ascendientes ([locationIds], que incluye la propia).
   */
  fun affectingPlant(plantId: PlantId, locationIds: Set<LocationId>): Specification<Task> =
    Specification { root, query, cb ->
      val expressly = hasPlant(root, query!!, cb) { plant -> cb.equal(plant.get<PlantId>("id"), plantId) }
      if (locationIds.isEmpty()) expressly else cb.or(expressly, locationId(root).`in`(locationIds))
    }

  /** Las tareas con alguna planta expresa de **cualquiera** de esas especies. */
  fun bySpecies(speciesIds: Set<SpeciesId>): Specification<Task> =
    Specification { root, query, cb ->
      if (speciesIds.isEmpty()) {
        null
      } else {
        hasPlant(root, query!!, cb) { plant -> plant.get<Species>("species").get<SpeciesId>("id").`in`(speciesIds) }
      }
    }

  /**
   * El identificador de la localización destino, por un `LEFT JOIN` explícito: una tarea de plantas no
   * tiene localización, y un `INNER JOIN` implícito la dejaría fuera de cualquier `OR`.
   */
  private fun locationId(root: jakarta.persistence.criteria.Root<Task>) =
    root.join<Task, Location>("location", jakarta.persistence.criteria.JoinType.LEFT).get<LocationId>("id")

  /** `EXISTS` sobre las plantas expresas: dos subconsultas y ningún `DISTINCT` que multiplique filas. */
  private fun hasPlant(
    root: jakarta.persistence.criteria.Root<Task>,
    query: jakarta.persistence.criteria.CriteriaQuery<*>,
    cb: jakarta.persistence.criteria.CriteriaBuilder,
    condition: (jakarta.persistence.criteria.Join<Task, Plant>) -> jakarta.persistence.criteria.Predicate,
  ): jakarta.persistence.criteria.Predicate {
    val sub = query.subquery(Long::class.java)
    val other = sub.from(Task::class.java)
    val plant = other.join<Task, Plant>("plantSet")
    sub.select(cb.literal(1L)).where(cb.equal(other, root), condition(plant))
    return cb.exists(sub)
  }
}

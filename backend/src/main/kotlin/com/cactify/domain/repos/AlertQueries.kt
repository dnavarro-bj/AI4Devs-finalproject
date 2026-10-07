package com.cactify.domain.repos

import com.cactify.domain.AlertSeverity
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.TaskId
import com.cactify.domain.TaskType
import java.time.Instant
import java.time.LocalDate

/** Cuántas alertas abiertas afectan a algo y la mayor severidad entre ellas (ausente si no hay ninguna). */
data class AlertSummary(val count: Long, val highest: AlertSeverity?) {
  companion object {
    val NONE = AlertSummary(0, null)
  }
}

/** Un ejemplar en curso cuya última observación es anterior al corte. */
data class UnobservedPlant(val plantId: PlantId, val lastObservation: Instant)

/** Una tarea pendiente vencida dirigida a **una** planta o a una localización. */
data class OverdueTask(
  val taskId: TaskId,
  val type: TaskType,
  val title: String,
  val dueTo: LocalDate,
  val plantId: PlantId?,
  val locationId: LocationId?,
)

/**
 * Lo que las alertas necesitan y no es una consulta derivada: agregados por página, consultas
 * recursivas de la jerarquía y las dos condiciones de tiempo. Es un puerto aparte (como
 * [LocationHierarchy]) porque devuelve filas calculadas y no entidades, con un número de sentencias
 * que no depende del de filas (ADR-009).
 */
interface AlertQueries {

  /**
   * Serializa las detecciones de una misma condición hasta el final de la transacción. Sin esto, dos
   * lecturas simultáneas buscarían la alerta abierta, no la verían y chocarían con el índice único,
   * que **aborta** la transacción de PostgreSQL: no se puede reintentar dentro de ella.
   */
  fun lockCondition(key: String)

  /**
   * Las alertas abiertas de cada localización: las propias, las de los ejemplares que están en ella
   * y, con [withDescendants], las de toda su descendencia. Las localizaciones sin alertas no
   * aparecen en el mapa.
   */
  fun openSummaryByLocation(ids: Collection<LocationId>, withDescendants: Boolean): Map<LocationId, AlertSummary>

  /** La mayor severidad abierta de cada ejemplar; los que no tienen alertas abiertas no aparecen. */
  fun highestOpenSeverityByPlant(ids: Collection<PlantId>): Map<PlantId, AlertSeverity>

  /**
   * Los ejemplares **en curso** cuya última observación —lectura, comentario, intervención o
   * floración; no un movimiento ni un cambio de estado— es anterior o igual a [cutoff]. Sin ninguna,
   * cuenta su fecha de alta.
   */
  fun unobservedPlants(cutoff: Instant): List<UnobservedPlant>

  /** Las tareas pendientes con fin en [dueOnOrBefore] o antes, dirigidas a una localización o a una sola planta en curso. */
  fun overdueTasks(dueOnOrBefore: LocalDate): List<OverdueTask>
}

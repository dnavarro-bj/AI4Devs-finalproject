package com.cactify.domain.specs

import com.cactify.domain.Alert
import com.cactify.domain.AlertCategory
import com.cactify.domain.AlertSeverity
import com.cactify.domain.AlertSource
import com.cactify.domain.AlertStatus
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import jakarta.persistence.criteria.JoinType
import org.springframework.data.jpa.domain.Specification

/**
 * Filtros del listado de alertas como piezas nombradas y componibles, con la convención de
 * [PlantSpecs]: cada factoría devuelve `null` cuando su filtro no aplica.
 */
object AlertSpecs {

  fun byStatuses(statuses: Set<AlertStatus>): Specification<Alert> =
    Specification { root, _, _ -> if (statuses.isEmpty()) null else root.get<AlertStatus>("status").`in`(statuses) }

  fun bySeverities(severities: Set<AlertSeverity>): Specification<Alert> =
    Specification { root, _, _ -> if (severities.isEmpty()) null else root.get<AlertSeverity>("severity").`in`(severities) }

  fun bySource(source: AlertSource?): Specification<Alert> =
    Specification { root, _, cb -> source?.let { cb.equal(root.get<AlertSource>("source"), it) } }

  fun byCategory(category: AlertCategory?): Specification<Alert> =
    Specification { root, _, cb -> category?.let { cb.equal(root.get<AlertCategory>("category"), it) } }

  fun byPlant(plantId: PlantId?): Specification<Alert> =
    Specification { root, _, cb -> plantId?.let { cb.equal(root.get<Plant>("plant").get<PlantId>("id"), it) } }

  /**
   * Las alertas de **cualquiera** de esas localizaciones —las propias— o de ejemplares que estén
   * ahora en alguna de ellas. Un conjunto vacío no admite nada: es una localización que no existe, no
   * un filtro ausente.
   */
  fun byLocations(locationIds: Set<LocationId>): Specification<Alert> =
    Specification { root, _, cb ->
      if (locationIds.isEmpty()) {
        cb.disjunction()
      } else {
        val ownLocation = root.join<Alert, Location>("location", JoinType.LEFT)
        val plantLocation = root.join<Alert, Plant>("plant", JoinType.LEFT).join<Plant, Location>("location", JoinType.LEFT)
        cb.or(ownLocation.get<LocationId>("id").`in`(locationIds), plantLocation.get<LocationId>("id").`in`(locationIds))
      }
    }

  /** Las abiertas de una planta, para su ficha. */
  fun openOfPlant(plantId: PlantId): Specification<Alert> =
    byStatuses(AlertStatus.open).and(byPlant(plantId))
}

/**
 * Las alertas se ordenan por detección, por última detección, por severidad —**por su rango, no
 * alfabéticamente**— o por estado. Sin orden pedido, el de la bandeja lo fija el controller.
 */
val AlertSortKeys = SortKeys(
  linkedMapOf(
    "detected" to "detectedAt",
    "lastDetected" to "lastDetectedAt",
    "severity" to "severityRank",
    "status" to "status",
  ),
)

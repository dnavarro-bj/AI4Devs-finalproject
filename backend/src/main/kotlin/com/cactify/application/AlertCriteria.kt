package com.cactify.application

import com.cactify.domain.AlertCategory
import com.cactify.domain.AlertSeverity
import com.cactify.domain.AlertSource
import com.cactify.domain.AlertStatus
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId

/**
 * Los criterios del listado de alertas, ya interpretados (ADR-016). Se validan **al construirse**: un
 * valor que el listado no puede servir es un `IllegalArgumentException` —un `400`— y nunca llega a la
 * consulta. Un criterio vacío no filtra. `status` y `severity` son repetibles: cualquiera de los valores.
 */
class AlertCriteria(
  statuses: List<String> = emptyList(),
  severities: List<String> = emptyList(),
  source: String? = null,
  category: String? = null,
  plant: String? = null,
  location: String? = null,
  val includeDescendants: Boolean = false,
) {
  val statuses: Set<AlertStatus> = statuses.map { AlertStatus(it) }.toSet()
  val severities: Set<AlertSeverity> = severities.map { AlertSeverity(it) }.toSet()
  val source: AlertSource? = source?.takeIf { it.isNotBlank() }?.let { AlertSource(it) }
  val category: AlertCategory? = category?.takeIf { it.isNotBlank() }?.let { AlertCategory(it) }
  val plantId: PlantId? = plant?.takeIf { it.isNotBlank() }?.let { PlantId.from(it) }
  val locationId: LocationId? = location?.takeIf { it.isNotBlank() }?.let { LocationId.from(it) }
}

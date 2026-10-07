package com.cactify.domain.repos

import com.cactify.domain.Alert
import com.cactify.domain.AlertCategory
import com.cactify.domain.AlertId
import com.cactify.domain.AlertSource
import com.cactify.domain.AlertTransition
import com.cactify.domain.AlertTransitionId
import com.cactify.domain.CareRecordId
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification

/**
 * Puerto de las alertas. El listado solo existe filtrado y paginado (ADR-009). «Abierta» es la que
 * no tiene fecha de cierre (`nueva` o `revisada`): el esquema garantiza que cerrada ⇔ con fecha.
 */
interface AlertRepository {
  fun save(alert: Alert): Alert
  fun findOneById(id: AlertId): Alert?

  /** La alerta con su fila **bloqueada** hasta el final de la transacción: serializa dos cierres simultáneos. */
  fun findOneByIdForUpdate(id: AlertId): Alert?
  fun findAll(spec: Specification<Alert>?, pageable: Pageable): Page<Alert>
  fun findAllByIdIn(ids: Collection<AlertId>): List<Alert>

  /** La alerta **abierta** de una condición sobre una planta, si la hay: lo que sostiene «sin duplicados». */
  fun findOpenOfPlant(plantId: PlantId, source: AlertSource, category: AlertCategory): Alert?

  /** La alerta **abierta** de una condición sobre una localización, si la hay. */
  fun findOpenOfLocation(locationId: LocationId, source: AlertSource, category: AlertCategory): Alert?

  /** Las alertas abiertas que enlazan esa lectura, de la más grave a la más leve. */
  fun findOpenByCareRecord(careRecordId: CareRecordId): List<Alert>

  /** Si alguna alerta propia, en cualquier estado, apunta a esa localización: sostiene el `409` al retirarla. */
  fun existsByLocationId(locationId: LocationId): Boolean
}

/** El historial de las alertas. */
interface AlertTransitionRepository {
  fun save(transition: AlertTransition): AlertTransition

  /** El historial de una alerta, de la apertura en adelante. */
  fun findAllByAlertId(alertId: AlertId): List<AlertTransition>

  /** Las transiciones de una página de la cronología, con su alerta, en una sola consulta. */
  fun findAllByIdIn(ids: Collection<AlertTransitionId>): List<AlertTransition>
}

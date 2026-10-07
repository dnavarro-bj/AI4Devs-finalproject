package com.cactify.domain.repos

import com.cactify.domain.PlantId
import com.cactify.domain.TimelineType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/** Una referencia a un evento de la cronología: de qué tipo es y su identificador en su tabla. */
data class TimelineRef(val type: TimelineType, val id: Long)

/**
 * Puerto de la cronología unificada. Devuelve **referencias**, ya filtradas por tipo, ordenadas por
 * instante descendente con el identificador como desempate y paginadas; el detalle de cada tipo se
 * carga aparte. El orden lo fija el puerto: `pageable` solo aporta la página y el tamaño.
 */
interface PlantTimelineRepository {
  fun findPage(plantId: PlantId, types: Set<TimelineType>, pageable: Pageable): Page<TimelineRef>
}

package com.cactify.domain.repos

import com.cactify.domain.PlantId
import com.cactify.domain.PlantStatusChange
import com.cactify.domain.PlantStatusChangeId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/** Puerto del historial de cambios de estado. Paginado siempre (ADR-009). */
interface PlantStatusChangeRepository {
  fun save(change: PlantStatusChange): PlantStatusChange
  /** Los cambios de una página de la cronología, en una sola consulta. */
  fun findAllByIdIn(ids: Collection<PlantStatusChangeId>): List<PlantStatusChange>
  fun findByPlantId(plantId: PlantId, pageable: Pageable): Page<PlantStatusChange>
}

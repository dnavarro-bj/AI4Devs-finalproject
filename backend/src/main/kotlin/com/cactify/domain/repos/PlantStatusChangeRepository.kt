package com.cactify.domain.repos

import com.cactify.domain.PlantId
import com.cactify.domain.PlantStatusChange
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/** Puerto del historial de cambios de estado. Paginado siempre (ADR-009). */
interface PlantStatusChangeRepository {
  fun save(change: PlantStatusChange): PlantStatusChange
  fun findByPlantId(plantId: PlantId, pageable: Pageable): Page<PlantStatusChange>
}

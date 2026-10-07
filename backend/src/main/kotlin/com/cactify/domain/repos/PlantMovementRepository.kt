package com.cactify.domain.repos

import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMovement
import com.cactify.domain.PlantMovementId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/** Puerto del historial de movimientos. Paginado siempre (ADR-009). */
interface PlantMovementRepository {
  fun save(movement: PlantMovement): PlantMovement

  /** Los movimientos de un ejemplar, con sus localizaciones ya cargadas. */
  /** Los movimientos de una página de la cronología, con sus localizaciones, en una sola consulta. */
  fun findAllByIdIn(ids: Collection<PlantMovementId>): List<PlantMovement>
  fun findByPlantId(plantId: PlantId, pageable: Pageable): Page<PlantMovement>

  /** Los movimientos que tienen a la localización como origen **o** destino (no los de sus descendientes). */
  fun findByLocationId(locationId: LocationId, pageable: Pageable): Page<PlantMovement>

  /** Si la localización aparece en algún movimiento: bloquea su retirada para no dejar el historial huérfano. */
  fun existsByLocationId(locationId: LocationId): Boolean
}

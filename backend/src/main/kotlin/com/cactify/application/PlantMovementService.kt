package com.cactify.application

import com.cactify.application.dto.MoveResultResponse
import com.cactify.application.dto.MovementLocationResponse
import com.cactify.application.dto.MovementResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMovement
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantMovementRepository
import com.cactify.domain.repos.PlantRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/**
 * Mover ejemplares entre localizaciones y consultar dónde han estado (historia 1.9). El lote es
 * **atómico**: una sola transacción, así que una excepción deshace todo y no hay estado intermedio.
 */
@Service
class PlantMovementService(
  private val plantRepository: PlantRepository,
  private val locationRepository: LocationRepository,
  private val movementRepository: PlantMovementRepository,
  private val clock: Clock,
) {

  /**
   * Mueve los ejemplares al destino. Un destino inexistente es `404` (es el recurso de la ruta); la
   * lista vacía, repetida, demasiado larga o con un ejemplar inexistente es `400` (es el cuerpo). Los
   * que ya están en el destino se ignoran y se cuentan aparte.
   */
  @Transactional
  fun move(destinationId: String, plantIds: List<String>): MoveResultResponse {
    val destination = locationRepository.findOneById(LocationId.from(destinationId))
      ?: throw LocationNotFoundException(destinationId)
    require(plantIds.isNotEmpty()) { "Hay que indicar al menos un ejemplar que mover" }
    require(plantIds.size <= MAX_BATCH) { "No se pueden mover más de $MAX_BATCH ejemplares de una vez" }
    val requested = plantIds.map { PlantId.from(it) }
    require(requested.toSet().size == requested.size) { "La lista de ejemplares tiene identificadores repetidos" }

    val found = plantRepository.findAllWithLocationByIdIn(requested)
    val missing = requested.toSet() - found.map { it.id }.toSet()
    if (missing.isNotEmpty()) throw InvalidReferenceException("El ejemplar", missing.joinToString(", ") { it.toString() })

    val movements = found.mapNotNull { it.moveTo(destination, clock) }
    movements.forEach { movementRepository.save(it) }
    return MoveResultResponse(moved = movements.size, unchanged = found.size - movements.size)
  }

  @Transactional(readOnly = true)
  fun historyOfPlant(plantId: String, pageable: Pageable): PageResponse<MovementResponse> {
    val plant = plantRepository.findOneById(PlantId.from(plantId)) ?: throw PlantNotFoundException(plantId)
    return PageResponse.of(movementRepository.findByPlantId(plant.id, pageable)) { it.toResponse() }
  }

  @Transactional(readOnly = true)
  fun historyOfLocation(locationId: String, pageable: Pageable): PageResponse<MovementResponse> {
    val location = locationRepository.findOneById(LocationId.from(locationId)) ?: throw LocationNotFoundException(locationId)
    return PageResponse.of(movementRepository.findByLocationId(location.id, pageable)) { it.toResponse() }
  }

  private fun PlantMovement.toResponse() = MovementResponse(
    id = id.toString(),
    plantId = plant.id.toString(),
    plantCode = plant.code,
    from = MovementLocationResponse(fromLocation.id.toString(), fromLocation.name),
    to = MovementLocationResponse(toLocation.id.toString(), toLocation.name),
    movedAt = movedAt,
  )

  private companion object {
    /** El producto no maneja más de ~2000 ejemplares: más que eso en una petición es un error del cliente. */
    const val MAX_BATCH = 2000
  }
}

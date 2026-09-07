package com.cactify.application

import com.cactify.application.dto.LocationDetailResponse
import com.cactify.application.dto.LocationResponse
import com.cactify.application.dto.LocationSummaryResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.repos.LocationRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Casos de uso del catálogo de localizaciones (historia 0.9). Como en el resto de servicios, el
 * mapeo a DTO ocurre **dentro** de la transacción: con `open-in-view: false` la sesión está
 * cerrada cuando el controller escribe la respuesta.
 */
@Service
class LocationService(private val locationRepository: LocationRepository) {

  @Transactional
  fun create(name: String): LocationResponse =
    locationRepository.save(Location(name = name.trim())).toResponse()

  /**
   * El catálogo con la carga de cada sitio. Los recuentos se piden **una sola vez** para la página
   * entera: es el dato que sostiene el mapa del vivero, y pedirlo fila a fila sería un `N+1`.
   */
  @Transactional(readOnly = true)
  fun list(pageable: Pageable): PageResponse<LocationSummaryResponse> {
    val page = locationRepository.findAll(pageable)
    val usage = locationRepository.countPlantsByLocation(page.content.map { it.id })
      .associate { it.locationId to it.plantCount }

    return PageResponse.of(page) {
      LocationSummaryResponse(
        id = it.id.toString(),
        name = it.name,
        plantCount = usage[it.id] ?: 0,
      )
    }
  }

  /** La ficha lleva el recuento de ejemplares; el listado no, para no volverlo una consulta por fila. */
  @Transactional(readOnly = true)
  fun findById(id: String): LocationDetailResponse {
    val location = requireLocation(id)
    return LocationDetailResponse(
      id = location.id.toString(),
      name = location.name,
      plantCount = locationRepository.countPlantsIn(location.id),
    )
  }

  /**
   * Corrige el nombre. La validación no se duplica aquí: `Location.rename` revalida su invariante
   * antes de tocar nada (ADR-011) y el manejador global traduce el rechazo a `400`.
   */
  @Transactional
  fun rename(id: String, name: String): LocationResponse {
    val location = requireLocation(id)
    location.rename(name.trim())
    return location.toResponse()
  }

  /**
   * Retira la localización del catálogo. Comprueba los ejemplares **antes** de borrar: dejar que
   * lo rechace la FK convertiría un caso previsible en un 500, igual que en especies y mezclas.
   */
  @Transactional
  fun delete(id: String) {
    val location = requireLocation(id)
    if (locationRepository.countPlantsIn(location.id) > 0) throw LocationInUseException(id)
    locationRepository.delete(location)
  }

  private fun requireLocation(id: String): Location =
    locationRepository.findOneById(LocationId.from(id)) ?: throw LocationNotFoundException(id)

  private fun Location.toResponse() = LocationResponse(id = id.toString(), name = name)
}

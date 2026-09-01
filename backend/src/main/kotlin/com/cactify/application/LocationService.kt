package com.cactify.application

import com.cactify.application.dto.LocationResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.Location
import com.cactify.domain.repos.LocationRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class LocationService(private val locationRepository: LocationRepository) {

  @Transactional
  fun create(name: String): LocationResponse =
    locationRepository.save(Location(name = name.trim())).toResponse()

  @Transactional(readOnly = true)
  fun list(pageable: Pageable): PageResponse<LocationResponse> =
    PageResponse.of(locationRepository.findAll(pageable)) { it.toResponse() }

  private fun Location.toResponse() = LocationResponse(id = id.toString(), name = name)
}

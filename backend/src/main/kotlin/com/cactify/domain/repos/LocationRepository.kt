package com.cactify.domain.repos

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Puerto de acceso a localizaciones. No expone `findAll()` sin paginar: en este API no existe el
 * listado sin límite (ADR-009).
 */
interface LocationRepository {
  fun save(location: Location): Location
  fun findOneById(id: LocationId): Location?
  fun findAll(pageable: Pageable): Page<Location>
}

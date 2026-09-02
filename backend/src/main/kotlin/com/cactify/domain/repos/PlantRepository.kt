package com.cactify.domain.repos

import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.SpeciesId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification

/**
 * Puerto de acceso a plantas. El listado solo existe en su forma filtrada y paginada: no hay
 * `findAll()` sin límite (ADR-009).
 */
interface PlantRepository {
  fun save(plant: Plant): Plant
  fun findOneById(id: PlantId): Plant?
  fun findAll(spec: Specification<Plant>?, pageable: Pageable): Page<Plant>

  /**
   * Si la especie tiene algún ejemplar. Es lo que sostiene el `409` al retirar una especie del
   * catálogo: `plant.species_id` es `NOT NULL` y no tiene `ON DELETE`, así que sin esta
   * comprobación el borrado reventaría contra la FK y acabaría en un `500`.
   */
  fun existsBySpeciesId(speciesId: SpeciesId): Boolean
}

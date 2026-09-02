package com.cactify.domain.repos

import com.cactify.domain.Plant
import com.cactify.domain.PlantId
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
}

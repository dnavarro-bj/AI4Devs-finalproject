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

  /**
   * Baja el insert en el acto, para que la `created_at` que pone la base de datos vuelva a la
   * entidad antes de que el servicio construya el DTO.
   */
  fun saveAndFlush(plant: Plant): Plant
  fun findOneById(id: PlantId): Plant?
  fun findAll(spec: Specification<Plant>?, pageable: Pageable): Page<Plant>
}

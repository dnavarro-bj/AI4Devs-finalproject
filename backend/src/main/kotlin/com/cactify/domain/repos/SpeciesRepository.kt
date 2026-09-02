package com.cactify.domain.repos

import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Puerto de acceso a especies (ADR-006): interfaz Kotlin pura, sin más tipos de Spring que
 * `Page` y `Pageable`. Declara solo lo que el dominio necesita, no la superficie completa de
 * Spring Data — en particular, ningún `findAll()` sin paginar (ADR-009).
 */
interface SpeciesRepository {
  fun save(species: Species): Species
  fun delete(species: Species)
  fun findOneById(id: SpeciesId): Species?
  fun findByScientificName(scientificName: String): Species?
  fun findAll(pageable: Pageable): Page<Species>
}

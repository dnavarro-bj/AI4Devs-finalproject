package com.cactify.domain.repos

import com.cactify.domain.Species
import com.cactify.domain.SpeciesId

/**
 * Puerto de acceso a especies (ADR-006): interfaz Kotlin pura, sin tipos ni anotaciones de Spring.
 * Declara solo lo que el dominio necesita, no la superficie completa de Spring Data — en
 * particular, ningún `findAll()` sin paginar.
 */
interface SpeciesRepository {
  fun findOneById(id: SpeciesId): Species?
  fun findByScientificName(scientificName: String): Species?
}

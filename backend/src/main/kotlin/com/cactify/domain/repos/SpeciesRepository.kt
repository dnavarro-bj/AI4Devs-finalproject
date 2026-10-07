package com.cactify.domain.repos

import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification

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
  fun findByCode(code: String): Species?

  /**
   * La especie con su fila **bloqueada** hasta el final de la transacción. Es lo que serializa las
   * altas de ejemplares de una misma especie: quien llegue después espera y obtiene el número
   * siguiente. Un `MAX(...)+1` sobre `plant` no sirve: dos transacciones leerían el mismo máximo.
   */
  fun findOneByIdForUpdate(id: SpeciesId): Species?
  fun findAll(pageable: Pageable): Page<Species>

  /** El catálogo filtrado y paginado. Una especificación nula no filtra. */
  fun findAll(spec: Specification<Species>?, pageable: Pageable): Page<Species>

  /** Cuántas especies cumplen la especificación, sin traerlas. Una especificación nula las cuenta todas. */
  fun count(spec: Specification<Species>?): Long
}

package com.cactify.infrastructure.persistence

import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.SpeciesRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * Implementa el puerto extendiendo a la vez `JpaRepository`: Spring Data genera la
 * implementación y no hace falta clase adaptadora (decisión 2 del design de T-02).
 * `application` inyecta siempre [SpeciesRepository], nunca este tipo.
 */
@Repository
interface JpaSpeciesRepository :
  SpeciesRepository,
  JpaRepository<Species, SpeciesId>

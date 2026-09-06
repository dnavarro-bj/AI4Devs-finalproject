package com.cactify.infrastructure.persistence

import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.repos.SoilMixRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Implementa el puerto extendiendo a la vez `JpaRepository`: Spring Data genera la
 * implementación y no hace falta clase adaptadora. `application` inyecta siempre
 * [SoilMixRepository], nunca este tipo.
 */
@Repository
interface JpaSoilMixRepository :
  SoilMixRepository,
  JpaRepository<SoilMix, SoilMixId> {

  /**
   * Cuenta contra `Species`, que es quien tiene la referencia: `SoilMix` no conoce a sus especies
   * y no va a conocerlas solo para poder contarlas.
   */
  @Query("SELECT COUNT(s) FROM Species s WHERE s.soilMix.id = :id")
  override fun countSpeciesUsing(@Param("id") id: SoilMixId): Long
}

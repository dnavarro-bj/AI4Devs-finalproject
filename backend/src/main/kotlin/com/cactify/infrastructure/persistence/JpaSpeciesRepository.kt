package com.cactify.infrastructure.persistence

import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.repos.SpeciesUsage
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Implementa el puerto extendiendo a la vez `JpaRepository`: Spring Data genera la
 * implementación y no hace falta clase adaptadora (decisión 2 del design de T-02).
 * `application` inyecta siempre [SpeciesRepository], nunca este tipo.
 */
@Repository
interface JpaSpeciesRepository :
  SpeciesRepository,
  JpaRepository<Species, SpeciesId>,
  JpaSpecificationExecutor<Species> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from Species s where s.id = :id")
  override fun findOneByIdForUpdate(@Param("id") id: SpeciesId): Species?

  /** `LEFT JOIN` desde `Species`: contando sobre `Plant`, las especies sin ejemplares no producirían fila. */
  @Query(
    """
    SELECT new com.cactify.domain.repos.SpeciesUsage(s.id, COUNT(p))
    FROM Species s LEFT JOIN Plant p ON p.species = s
    WHERE s.id IN :ids
    GROUP BY s.id
    """,
  )
  override fun countPlantsBySpecies(@Param("ids") ids: Collection<SpeciesId>): List<SpeciesUsage>
}

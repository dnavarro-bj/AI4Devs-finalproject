package com.cactify.infrastructure.persistence

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.LocationUsage
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Implementa el puerto extendiendo a la vez `JpaRepository`: Spring Data genera la
 * implementación y no hace falta clase adaptadora. `application` inyecta siempre
 * [LocationRepository], nunca este tipo.
 */
@Repository
interface JpaLocationRepository :
  LocationRepository,
  JpaRepository<Location, LocationId> {

  /**
   * Cuenta contra `Plant`, que es quien tiene la referencia: `Location` no conoce a sus ejemplares
   * y no va a conocerlos solo para poder contarlos.
   */
  @Query("SELECT COUNT(p) FROM Plant p WHERE p.location.id = :id")
  override fun countPlantsIn(@Param("id") id: LocationId): Long

  @Query("SELECT l FROM Location l WHERE lower(trim(l.code)) = lower(trim(:code))")
  override fun findOneByCode(@Param("code") code: String): Location?

  @Query(
    value = "SELECT l FROM Location l WHERE l.parentId = :parentId",
    countQuery = "SELECT COUNT(l) FROM Location l WHERE l.parentId = :parentId",
  )
  override fun findByParentId(@Param("parentId") parentId: LocationId, pageable: Pageable): Page<Location>

  @Query(
    value = "SELECT l FROM Location l WHERE l.parentId.id IS NULL",
    countQuery = "SELECT COUNT(l) FROM Location l WHERE l.parentId.id IS NULL",
  )
  override fun findRoots(pageable: Pageable): Page<Location>

  @Query("SELECT COUNT(l) FROM Location l WHERE l.parentId = :id")
  override fun countChildren(@Param("id") id: LocationId): Long

  /**
   * `LEFT JOIN` desde `Location` y no desde `Plant`: contando sobre `Plant` las localizaciones
   * vacías no producirían fila y se perderían justo las que se pueden retirar. `COUNT(p)` cuenta
   * las plantas casadas, así que la vacía sale con cero.
   */
  @Query(
    """
    SELECT new com.cactify.domain.repos.LocationUsage(l.id, COUNT(p))
    FROM Location l LEFT JOIN Plant p ON p.location = l
    WHERE l.id IN :ids
    GROUP BY l.id
    """,
  )
  override fun countPlantsByLocation(@Param("ids") ids: Collection<LocationId>): List<LocationUsage>
}

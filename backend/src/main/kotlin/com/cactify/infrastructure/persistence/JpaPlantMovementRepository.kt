package com.cactify.infrastructure.persistence

import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMovement
import com.cactify.domain.PlantMovementId
import com.cactify.domain.repos.PlantMovementRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Las consultas traen planta y localizaciones con `join fetch`: el historial se pinta con sus
 * nombres, y resolverlos uno a uno sería un `N+1` por página.
 */
@Repository
interface JpaPlantMovementRepository :
  PlantMovementRepository,
  JpaRepository<PlantMovement, PlantMovementId> {

  @Query("select m from PlantMovement m join fetch m.fromLocation join fetch m.toLocation where m.id in :ids")
  override fun findAllByIdIn(@Param("ids") ids: Collection<PlantMovementId>): List<PlantMovement>

  @Query(
    value = """
      select m from PlantMovement m join fetch m.plant join fetch m.fromLocation join fetch m.toLocation
      where m.plant.id = :plantId
    """,
    countQuery = "select count(m) from PlantMovement m where m.plant.id = :plantId",
  )
  override fun findByPlantId(@Param("plantId") plantId: PlantId, pageable: Pageable): Page<PlantMovement>

  @Query(
    value = """
      select m from PlantMovement m join fetch m.plant join fetch m.fromLocation join fetch m.toLocation
      where m.fromLocation.id = :locationId or m.toLocation.id = :locationId
    """,
    countQuery = "select count(m) from PlantMovement m where m.fromLocation.id = :locationId or m.toLocation.id = :locationId",
  )
  override fun findByLocationId(@Param("locationId") locationId: LocationId, pageable: Pageable): Page<PlantMovement>

  @Query("select count(m) > 0 from PlantMovement m where m.fromLocation.id = :locationId or m.toLocation.id = :locationId")
  override fun existsByLocationId(@Param("locationId") locationId: LocationId): Boolean
}

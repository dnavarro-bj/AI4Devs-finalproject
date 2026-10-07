package com.cactify.infrastructure.persistence

import com.cactify.domain.Alert
import com.cactify.domain.AlertCategory
import com.cactify.domain.AlertId
import com.cactify.domain.AlertSource
import com.cactify.domain.AlertTransition
import com.cactify.domain.AlertTransitionId
import com.cactify.domain.CareRecordId
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.repos.AlertRepository
import com.cactify.domain.repos.AlertTransitionRepository
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * La bandeja pinta la planta con su especie y su localización, o la localización: se traen con la
 * propia consulta, y resolverlas una a una sería un `N+1` por página.
 */
@Repository
interface JpaAlertRepository :
  AlertRepository,
  JpaRepository<Alert, AlertId>,
  JpaSpecificationExecutor<Alert> {

  @EntityGraph(attributePaths = ["plant", "plant.species", "plant.location", "location"])
  override fun findAll(spec: Specification<Alert>?, pageable: Pageable): Page<Alert>

  @EntityGraph(attributePaths = ["plant", "plant.species", "plant.location", "location"])
  @Query("select a from Alert a where a.id in :ids")
  override fun findAllByIdIn(@Param("ids") ids: Collection<AlertId>): List<Alert>

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Alert a where a.id = :id")
  override fun findOneByIdForUpdate(@Param("id") id: AlertId): Alert?

  @Query("select a from Alert a where a.plant.id = :plantId and a.source = :source and a.category = :category and a.closedAt is null")
  override fun findOpenOfPlant(
    @Param("plantId") plantId: PlantId,
    @Param("source") source: AlertSource,
    @Param("category") category: AlertCategory,
  ): Alert?

  @Query("select a from Alert a where a.location.id = :locationId and a.source = :source and a.category = :category and a.closedAt is null")
  override fun findOpenOfLocation(
    @Param("locationId") locationId: LocationId,
    @Param("source") source: AlertSource,
    @Param("category") category: AlertCategory,
  ): Alert?

  @Query("select a from Alert a where a.careRecord.id = :careRecordId and a.closedAt is null order by a.severityRank desc, a.id.id")
  override fun findOpenByCareRecord(@Param("careRecordId") careRecordId: CareRecordId): List<Alert>

  @Query("select count(a) > 0 from Alert a where a.location.id = :locationId")
  override fun existsByLocationId(@Param("locationId") locationId: LocationId): Boolean
}

@Repository
interface JpaAlertTransitionRepository :
  AlertTransitionRepository,
  JpaRepository<AlertTransition, AlertTransitionId> {

  @Query("select t from AlertTransition t where t.alert.id = :alertId order by t.occurredAt, t.id.id")
  override fun findAllByAlertId(@Param("alertId") alertId: AlertId): List<AlertTransition>

  @Query("select t from AlertTransition t join fetch t.alert where t.id in :ids")
  override fun findAllByIdIn(@Param("ids") ids: Collection<AlertTransitionId>): List<AlertTransition>
}

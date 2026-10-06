package com.cactify.infrastructure.persistence

import com.cactify.domain.PlantId
import com.cactify.domain.PlantStatusChange
import com.cactify.domain.PlantStatusChangeId
import com.cactify.domain.repos.PlantStatusChangeRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface JpaPlantStatusChangeRepository :
  PlantStatusChangeRepository,
  JpaRepository<PlantStatusChange, PlantStatusChangeId> {

  @Query(
    value = "select c from PlantStatusChange c where c.plant.id = :plantId",
    countQuery = "select count(c) from PlantStatusChange c where c.plant.id = :plantId",
  )
  override fun findByPlantId(@Param("plantId") plantId: PlantId, pageable: Pageable): Page<PlantStatusChange>
}

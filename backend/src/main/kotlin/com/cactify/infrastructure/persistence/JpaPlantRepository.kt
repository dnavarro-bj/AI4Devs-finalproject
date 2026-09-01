package com.cactify.infrastructure.persistence

import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.repos.PlantRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.stereotype.Repository

/** `JpaSpecificationExecutor` aporta la ejecución de las `Specification` sin escribir nada. */
@Repository
interface JpaPlantRepository :
  PlantRepository,
  JpaRepository<Plant, PlantId>,
  JpaSpecificationExecutor<Plant>

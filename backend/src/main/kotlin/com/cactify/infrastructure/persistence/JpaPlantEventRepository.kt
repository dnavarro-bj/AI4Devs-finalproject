package com.cactify.infrastructure.persistence

import com.cactify.domain.PlantEvent
import com.cactify.domain.PlantEventId
import com.cactify.domain.repos.PlantEventRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface JpaPlantEventRepository :
  PlantEventRepository,
  JpaRepository<PlantEvent, PlantEventId>

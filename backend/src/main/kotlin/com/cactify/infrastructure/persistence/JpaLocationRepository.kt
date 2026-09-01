package com.cactify.infrastructure.persistence

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.repos.LocationRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface JpaLocationRepository :
  LocationRepository,
  JpaRepository<Location, LocationId>

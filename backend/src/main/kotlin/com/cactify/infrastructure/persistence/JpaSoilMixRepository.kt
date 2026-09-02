package com.cactify.infrastructure.persistence

import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.repos.SoilMixRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface JpaSoilMixRepository :
  SoilMixRepository,
  JpaRepository<SoilMix, SoilMixId>

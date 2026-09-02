package com.cactify.infrastructure.persistence

import com.cactify.domain.AIRecommendation
import com.cactify.domain.AIRecommendationId
import com.cactify.domain.repos.AIRecommendationRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface JpaAIRecommendationRepository :
  AIRecommendationRepository,
  JpaRepository<AIRecommendation, AIRecommendationId>

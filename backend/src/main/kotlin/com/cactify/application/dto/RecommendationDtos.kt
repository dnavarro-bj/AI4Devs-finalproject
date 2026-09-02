package com.cactify.application.dto

import java.time.Instant

/** La recomendación tal como la expone el API. Los enumerados viajan por su valor persistido. */
data class RecommendationResponse(
  val id: String,
  val careRecordId: String,
  val riskLevel: String,
  val explanation: String,
  val recommendedAction: String,
  val priority: String,
  val createdAt: Instant,
)

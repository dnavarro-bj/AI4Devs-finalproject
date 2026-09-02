package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "ai_recommendation")
class AIRecommendation(
  @EmbeddedId
  override val id: AIRecommendationId = AIRecommendationId.create(),
  careRecord: CareRecord,
  riskLevel: String,
  recommendationText: String,
) : AbstractEntity<AIRecommendationId>() {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "care_record_id", nullable = false)
  var careRecord: CareRecord = careRecord
    private set

  @Column(name = "risk_level", nullable = false)
  var riskLevel: String = riskLevel
    private set

  @Column(name = "recommendation_text", nullable = false)
  var recommendationText: String = recommendationText
    private set

  init {
    require(riskLevel.isNotBlank()) { "El nivel de riesgo es obligatorio" }
    require(recommendationText.isNotBlank()) { "El texto de la recomendación es obligatorio" }
  }
}

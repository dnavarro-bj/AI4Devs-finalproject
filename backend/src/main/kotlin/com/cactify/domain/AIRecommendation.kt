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
  riskLevel: RiskLevel,
  recommendationText: String,
  recommendedAction: String,
  priority: Priority,
) : AbstractEntity<AIRecommendationId>() {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "care_record_id", nullable = false)
  var careRecord: CareRecord = careRecord
    private set

  /** El tipo ya garantiza que el valor pertenece al conjunto: no hace falta invariante. */
  @Column(name = "risk_level", nullable = false)
  var riskLevel: RiskLevel = riskLevel
    private set

  @Column(name = "recommendation_text", nullable = false)
  var recommendationText: String = recommendationText
    private set

  @Column(name = "recommended_action", nullable = false)
  var recommendedAction: String = recommendedAction
    private set

  @Column(name = "priority", nullable = false)
  var priority: Priority = priority
    private set

  init {
    require(recommendationText.isNotBlank()) { "El texto de la recomendación es obligatorio" }
    // Para una planta sana la acción es "no hacer nada", que también es una acción: admitir el
    // vacío obligaría a todos los consumidores a distinguir "sin acción" de "no me dio ninguna".
    require(recommendedAction.isNotBlank()) { "La acción recomendada es obligatoria" }
  }
}

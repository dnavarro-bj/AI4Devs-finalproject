package com.cactify.domain

import io.hypersistence.tsid.TSID
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "ai_recommendation")
class AIRecommendation(
  @Id
  val id: Long = TSID.Factory.getTsid().toLong(),

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "care_record_id", nullable = false)
  var careRecord: CareRecord,

  @Column(name = "risk_level", nullable = false)
  var riskLevel: String,

  @Column(name = "recommendation_text", nullable = false)
  var recommendationText: String,

  @Column(name = "created_at", insertable = false, updatable = false)
  var createdAt: OffsetDateTime? = null,
)

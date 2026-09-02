package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.EmbeddedId
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant

@Entity
@Table(name = "care_record")
class CareRecord(
  @EmbeddedId
  override val id: CareRecordId = CareRecordId.create(),

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", nullable = false)
  var plant: Plant,

  var humidity: Int? = null,
  var temperature: Int? = null,
  var lightHours: Int? = null,

  @Column(name = "water_amount_ml")
  var waterAmountMl: Int? = null,

  @Column(name = "soil_ph")
  var soilPh: BigDecimal? = null,

  @Column(name = "recorded_at", nullable = false)
  var recordedAt: Instant,
) : AbstractEntity<CareRecordId>()

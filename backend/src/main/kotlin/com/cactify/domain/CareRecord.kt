package com.cactify.domain

import io.hypersistence.tsid.TSID
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.OffsetDateTime

@Entity
@Table(name = "care_record")
class CareRecord(
  @Id
  val id: Long = TSID.Factory.getTsid().toLong(),

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
  var recordedAt: OffsetDateTime,
)

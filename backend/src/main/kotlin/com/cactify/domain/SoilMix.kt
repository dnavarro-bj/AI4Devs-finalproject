package com.cactify.domain

import io.hypersistence.tsid.TSID
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "soil_mix")
class SoilMix(
  @Id
  val id: Long = TSID.Factory.getTsid().toLong(),
  var name: String,
  var organicPercentage: Int,
  var mineralPercentage: Int,
  var phMin: java.math.BigDecimal,
  var phMax: java.math.BigDecimal,
  var description: String? = null,
)

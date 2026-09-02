package com.cactify.domain

import jakarta.persistence.Entity
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Table

@Entity
@Table(name = "soil_mix")
class SoilMix(
  @EmbeddedId
  override val id: SoilMixId = SoilMixId.create(),
  var name: String,
  var organicPercentage: Int,
  var mineralPercentage: Int,
  var phMin: java.math.BigDecimal,
  var phMax: java.math.BigDecimal,
  var description: String? = null,
) : AbstractEntity<SoilMixId>()

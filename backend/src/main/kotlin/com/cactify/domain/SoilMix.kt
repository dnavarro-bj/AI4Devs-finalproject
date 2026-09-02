package com.cactify.domain

import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(name = "soil_mix")
class SoilMix(
  @EmbeddedId
  override val id: SoilMixId = SoilMixId.create(),
  name: String,
  organicPercentage: Int,
  mineralPercentage: Int,
  phMin: BigDecimal,
  phMax: BigDecimal,
  description: String? = null,
) : AbstractEntity<SoilMixId>() {

  var name: String = name
    private set

  var organicPercentage: Int = organicPercentage
    private set

  var mineralPercentage: Int = mineralPercentage
    private set

  var phMin: BigDecimal = phMin
    private set

  var phMax: BigDecimal = phMax
    private set

  var description: String? = description
    private set

  init {
    require(name.isNotBlank()) { "El nombre de la mezcla es obligatorio" }
    require(organicPercentage in 0..100) { "El porcentaje orgánico debe estar entre 0 y 100, y es $organicPercentage" }
    require(mineralPercentage in 0..100) { "El porcentaje mineral debe estar entre 0 y 100, y es $mineralPercentage" }
    require(organicPercentage + mineralPercentage == 100) {
      "Los porcentajes de la mezcla deben sumar 100, y suman ${organicPercentage + mineralPercentage}"
    }
    require(phMin in PH_MIN..PH_MAX) { "El pH mínimo debe estar entre 0 y 14, y es $phMin" }
    require(phMax in PH_MIN..PH_MAX) { "El pH máximo debe estar entre 0 y 14, y es $phMax" }
    require(phMin <= phMax) { "El pH mínimo ($phMin) no puede superar al máximo ($phMax)" }
  }

  private companion object {
    val PH_MIN: BigDecimal = BigDecimal.ZERO
    val PH_MAX: BigDecimal = BigDecimal(14)
  }
}

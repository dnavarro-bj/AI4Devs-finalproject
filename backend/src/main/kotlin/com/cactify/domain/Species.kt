package com.cactify.domain

import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "species")
class Species(
  @EmbeddedId
  override val id: SpeciesId = SpeciesId.create(),
  scientificName: String,
  commonName: String,
  minHumidity: Int,
  maxHumidity: Int,
  minTemperature: Int,
  maxTemperature: Int,
  minLightHours: Int,
  maxLightHours: Int,
  wateringGuideline: String,
  soilMix: SoilMix,
) : AbstractEntity<SpeciesId>() {

  var scientificName: String = scientificName
    private set

  var commonName: String = commonName
    private set

  var minHumidity: Int = minHumidity
    private set

  var maxHumidity: Int = maxHumidity
    private set

  var minTemperature: Int = minTemperature
    private set

  var maxTemperature: Int = maxTemperature
    private set

  var minLightHours: Int = minLightHours
    private set

  var maxLightHours: Int = maxLightHours
    private set

  var wateringGuideline: String = wateringGuideline
    private set

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "soil_mix_id", nullable = false)
  var soilMix: SoilMix = soilMix
    private set

  init {
    require(scientificName.isNotBlank()) { "El nombre científico es obligatorio" }
    require(commonName.isNotBlank()) { "El nombre común es obligatorio" }
    require(wateringGuideline.isNotBlank()) { "La pauta de riego es obligatoria" }
    require(minHumidity <= maxHumidity) {
      "La humedad mínima ($minHumidity) no puede superar a la máxima ($maxHumidity)"
    }
    require(minTemperature <= maxTemperature) {
      "La temperatura mínima ($minTemperature) no puede superar a la máxima ($maxTemperature)"
    }
    require(minLightHours <= maxLightHours) {
      "Las horas de luz mínimas ($minLightHours) no pueden superar a las máximas ($maxLightHours)"
    }
  }
}

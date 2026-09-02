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
    validate(
      scientificName,
      commonName,
      minHumidity,
      maxHumidity,
      minTemperature,
      maxTemperature,
      minLightHours,
      maxLightHours,
      wateringGuideline,
    )
  }

  /**
   * Reemplaza la ficha completa. Los campos van con `private set` y el constructor está cerrado,
   * así que este es el único camino para cambiarla, y revalida las mismas invariantes que el alta
   * (ADR-011). Valida **antes** de asignar: una ficha rechazada deja la especie intacta, no a
   * medio actualizar.
   */
  fun update(
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
  ) {
    validate(
      scientificName,
      commonName,
      minHumidity,
      maxHumidity,
      minTemperature,
      maxTemperature,
      minLightHours,
      maxLightHours,
      wateringGuideline,
    )
    this.scientificName = scientificName
    this.commonName = commonName
    this.minHumidity = minHumidity
    this.maxHumidity = maxHumidity
    this.minTemperature = minTemperature
    this.maxTemperature = maxTemperature
    this.minLightHours = minLightHours
    this.maxLightHours = maxLightHours
    this.wateringGuideline = wateringGuideline
    this.soilMix = soilMix
  }

  private companion object {
    /** Las invariantes de la ficha, compartidas por el alta y la edición. */
    fun validate(
      scientificName: String,
      commonName: String,
      minHumidity: Int,
      maxHumidity: Int,
      minTemperature: Int,
      maxTemperature: Int,
      minLightHours: Int,
      maxLightHours: Int,
      wateringGuideline: String,
    ) {
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
}

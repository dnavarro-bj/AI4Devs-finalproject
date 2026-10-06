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
  code: String,
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

  /** El código de inventario (`CAT-GRUSS`): prefijo del de cada uno de sus ejemplares. */
  var code: String = code
    private set

  /**
   * El número que llevará el **siguiente** ejemplar. Solo crece: un número asignado no se reutiliza.
   * Se toma con [nextPlantCode], que es el único camino, y con la fila bloqueada (ver
   * `SpeciesRepository.findOneByIdForUpdate`).
   */
  var nextSequence: Int = 1
    private set

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
    InventoryCodes.requireValid(code, "de la especie", InventoryCodes.SPECIES_MAX_LENGTH)
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
    code: String,
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
    InventoryCodes.requireValid(code, "de la especie", InventoryCodes.SPECIES_MAX_LENGTH)
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
    this.code = code
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

  /**
   * El código del siguiente ejemplar: el de la especie y un número correlativo con **al menos dos
   * cifras** (`CAT-GRUSS-01`), que crece con naturalidad (`-100`). Avanza el contador en el mismo
   * paso, de modo que no se puede leer un número sin consumirlo.
   */
  fun nextPlantCode(): String {
    val number = nextSequence
    nextSequence = number + 1
    return "$code-${number.toString().padStart(2, '0')}"
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

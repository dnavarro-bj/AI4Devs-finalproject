package com.cactify.domain

import jakarta.persistence.CascadeType
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

/**
 * La ficha de cultivo de una especie: lo que la describe más allá de cuánto aguanta. Todo opcional
 * —una especie recién dada de alta no tiene por qué saberlo—, y los textos en blanco son ausentes.
 *
 * La exposición y las horas de luz son **independientes**: una dice cómo llega la luz, la otra
 * cuánta; ninguna se deduce ni se valida contra la otra.
 */
data class CultivationProfile(
  val description: String? = null,
  val sunExposure: SunExposure? = null,
  val environment: Environment? = null,
  val bloomDescription: String? = null,
  val bloomColor: String? = null,
  val bloomMaturity: String? = null,
  val bloomTypicalDuration: String? = null,
) {
  fun normalized() = copy(
    description = description.blankToNull(),
    bloomDescription = bloomDescription.blankToNull(),
    bloomColor = bloomColor.blankToNull(),
    bloomMaturity = bloomMaturity.blankToNull(),
    bloomTypicalDuration = bloomTypicalDuration.blankToNull(),
  )

  private fun String?.blankToNull() = this?.trim()?.takeIf { it.isNotEmpty() }
}

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
  profile: CultivationProfile = CultivationProfile(),
  periods: List<PeriodSpec> = emptyList(),
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

  var description: String? = null
    private set

  var sunExposure: SunExposure? = null
    private set

  var environment: Environment? = null
    private set

  var bloomDescription: String? = null
    private set

  var bloomColor: String? = null
    private set

  var bloomMaturity: String? = null
    private set

  var bloomTypicalDuration: String? = null
    private set

  @OneToMany(mappedBy = "species", cascade = [CascadeType.ALL], orphanRemoval = true)
  private val periodRows: MutableList<SpeciesPeriod> = mutableListOf()

  /** El calendario anual, ordenado por tipo y por mes de inicio. */
  val periods: List<SpeciesPeriod>
    get() = periodRows.sortedWith(compareBy({ it.type.ordinal }, { it.startMonth }))

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
    SpeciesCalendar.requireCoherent(periods)
    applyProfile(profile)
    replacePeriods(periods)
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
    profile: CultivationProfile = CultivationProfile(),
    periods: List<PeriodSpec> = emptyList(),
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
    SpeciesCalendar.requireCoherent(periods)
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
    applyProfile(profile)
    replacePeriods(periods)
  }

  private fun applyProfile(profile: CultivationProfile) {
    val clean = profile.normalized()
    description = clean.description
    sunExposure = clean.sunExposure
    environment = clean.environment
    bloomDescription = clean.bloomDescription
    bloomColor = clean.bloomColor
    bloomMaturity = clean.bloomMaturity
    bloomTypicalDuration = clean.bloomTypicalDuration
  }

  /** El calendario enviado **sustituye** al guardado; ya validado, así que no queda a medias. */
  private fun replacePeriods(specs: List<PeriodSpec>) {
    periodRows.clear()
    specs.map { it.normalized() }.forEach {
      periodRows += SpeciesPeriod(
        species = this,
        type = it.type,
        startMonth = it.startMonth,
        endMonth = it.endMonth,
        intensity = it.intensity,
        notes = it.notes,
      )
    }
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
      CareRanges.requireCoherent(minHumidity, maxHumidity, minTemperature, maxTemperature, minLightHours, maxLightHours)
    }
  }
}

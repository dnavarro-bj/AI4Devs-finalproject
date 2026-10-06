package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne

/**
 * Los cuidados **propios** de un ejemplar: lo que sobrescribe de la pauta de su especie. Cada valor es
 * independiente y opcional; **nulo significa «hereda de la especie»**. Un ejemplar sin ningún valor
 * propio no tiene objeto (es `null`, ver [normalized]).
 *
 * Sabe resolver el perfil que de verdad se aplica ([effective]) y comprobar que ese perfil es
 * coherente ([validateAgainst]): sobrescribir un solo extremo se juzga contra el otro que se
 * aplicaría, que si no está sobrescrito es el de la especie.
 */
@Embeddable
data class CareOverrides(
  @Column(name = "care_min_humidity") val minHumidity: Int? = null,
  @Column(name = "care_max_humidity") val maxHumidity: Int? = null,
  @Column(name = "care_min_temperature") val minTemperature: Int? = null,
  @Column(name = "care_max_temperature") val maxTemperature: Int? = null,
  @Column(name = "care_min_light_hours") val minLightHours: Int? = null,
  @Column(name = "care_max_light_hours") val maxLightHours: Int? = null,
  @Column(name = "care_watering_guideline") val wateringGuideline: String? = null,
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "care_soil_mix_id")
  val soilMix: SoilMix? = null,
) {

  val isEmpty: Boolean
    get() = listOf(minHumidity, maxHumidity, minTemperature, maxTemperature, minLightHours, maxLightHours,
      wateringGuideline, soilMix).all { it == null }

  /** El valor propio donde lo hay y el de la especie donde no, con la lista de lo que se aparta. */
  fun effective(species: Species): EffectiveCare = EffectiveCare(
    minHumidity = minHumidity ?: species.minHumidity,
    maxHumidity = maxHumidity ?: species.maxHumidity,
    minTemperature = minTemperature ?: species.minTemperature,
    maxTemperature = maxTemperature ?: species.maxTemperature,
    minLightHours = minLightHours ?: species.minLightHours,
    maxLightHours = maxLightHours ?: species.maxLightHours,
    wateringGuideline = wateringGuideline ?: species.wateringGuideline,
    soilMix = soilMix ?: species.soilMix,
    overridden = listOfNotNull(
      "minHumidity".takeIf { minHumidity != null },
      "maxHumidity".takeIf { maxHumidity != null },
      "minTemperature".takeIf { minTemperature != null },
      "maxTemperature".takeIf { maxTemperature != null },
      "minLightHours".takeIf { minLightHours != null },
      "maxLightHours".takeIf { maxLightHours != null },
      "wateringGuideline".takeIf { wateringGuideline != null },
      "soilMix".takeIf { soilMix != null },
    ),
  )

  /**
   * Lanza si el perfil efectivo con esta especie es imposible o si algún valor propio está fuera de
   * escala. La escala (humedad 0–100, luz 0–24) solo se exige a lo propio: `Species` no la exige
   * hoy, y endurecerla allí cambiaría su contrato sin que nadie lo haya pedido.
   */
  fun validateAgainst(species: Species) {
    listOf("mínima" to minHumidity, "máxima" to maxHumidity).forEach { (which, value) ->
      require(value == null || value in 0..100) { "La humedad $which propia debe estar entre 0 y 100, y es $value" }
    }
    listOf("mínimas" to minLightHours, "máximas" to maxLightHours).forEach { (which, value) ->
      require(value == null || value in 0..24) { "Las horas de luz $which propias deben estar entre 0 y 24, y son $value" }
    }
    val effective = effective(species)
    CareRanges.requireCoherent(
      effective.minHumidity, effective.maxHumidity,
      effective.minTemperature, effective.maxTemperature,
      effective.minLightHours, effective.maxLightHours,
    )
  }
}

/** El perfil que se aplica a un ejemplar, ya resuelto, y qué campos de él se apartan de la especie. */
data class EffectiveCare(
  val minHumidity: Int,
  val maxHumidity: Int,
  val minTemperature: Int,
  val maxTemperature: Int,
  val minLightHours: Int,
  val maxLightHours: Int,
  val wateringGuideline: String,
  val soilMix: SoilMix,
  val overridden: List<String>,
)

/**
 * Sin valores propios no hay objeto: un riego en blanco cuenta como no sobrescrito y un objeto
 * vacío es `null`. Es también lo que Hibernate devuelve cuando todas las columnas son nulas.
 */
fun CareOverrides?.normalized(): CareOverrides? {
  if (this == null) return null
  val clean = copy(wateringGuideline = wateringGuideline?.trim()?.takeIf { it.isNotEmpty() })
  return clean.takeUnless { it.isEmpty }
}

package com.cactify.application.dto

import java.time.Instant
import java.time.LocalDate

/** Datos de cuidado que la planta hereda de su especie. */
data class SpeciesCareResponse(
  val id: String,
  /** El código de inventario de la especie (`CAT-GRUSS`). */
  val code: String,
  val scientificName: String,
  val commonName: String,
  val minHumidity: Int,
  val maxHumidity: Int,
  val minTemperature: Int,
  val maxTemperature: Int,
  val minLightHours: Int,
  val maxLightHours: Int,
  val wateringGuideline: String,
  /**
   * La mezcla que recomienda la especie. T-08 la dejó fuera porque nadie la consumía; el editor
   * de especie la necesita, porque `PUT /species/{id}` es reemplazo completo y la exige.
   */
  val soilMix: SoilMixSummaryResponse,
)

/** Especie en el listado: sin los rangos de cuidado, que solo interesan en el detalle. */
data class SpeciesSummaryResponse(
  val id: String,
  val code: String,
  val scientificName: String,
  val commonName: String,
)

data class PlantDetailResponse(
  val id: String,
  /** El código de inventario del ejemplar (`CAT-GRUSS-01`): inmutable. */
  val code: String,
  val nickname: String,
  val createdAt: Instant?,
  val location: LocationResponse,
  val species: SpeciesCareResponse,
  val tags: List<TagResponse>,
  /** En qué situación está: `activa`, `cuarentena`, `enferma`, `cedida`, `vendida`, `muerta` o `perdida`. */
  val status: String,
  val description: String?,
  val germinationYear: Int?,
  val germinationMonth: Int?,
  val acquiredOn: LocalDate?,
  val origin: String?,
  val originNote: String?,
  /** Solo lo que el ejemplar sobrescribe; ausente si hereda toda la pauta de su especie. */
  val careOverrides: CareOverridesResponse?,
  /** El perfil que se aplica, ya resuelto, y qué campos se apartan de la especie. */
  val effectiveCare: EffectiveCareResponse,
  /** Sus alertas abiertas, de la más grave a la más leve. */
  val openAlerts: List<AlertResponse> = emptyList(),
)

data class PlantSummaryResponse(
  val id: String,
  val code: String,
  val status: String,
  val nickname: String,
  val createdAt: Instant?,
  val location: LocationResponse,
  val species: SpeciesSummaryResponse,
  /** La mayor severidad entre sus alertas abiertas: `baja`, `media` o `critica`; ausente si no tiene ninguna. */
  @get:com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
  val attention: String? = null,
)

/**
 * La especie en su propia ficha: lo mismo que [SpeciesCareResponse] más **cuántos ejemplares tiene**.
 *
 * Es un DTO aparte y no un campo opcional del otro, porque [SpeciesCareResponse] también viaja
 * anidado en `GET /plants/{id}`, donde un recuento no tiene sentido y costaría una consulta más. El
 * recuento decide si el código de la especie se puede corregir (solo mientras no tenga ejemplares),
 * y vive en la ficha y no en el listado por lo mismo que en localizaciones y etiquetas: en el
 * listado sería una consulta por fila.
 */
data class SpeciesDetailResponse(
  val id: String,
  val code: String,
  val scientificName: String,
  val commonName: String,
  val minHumidity: Int,
  val maxHumidity: Int,
  val minTemperature: Int,
  val maxTemperature: Int,
  val minLightHours: Int,
  val maxLightHours: Int,
  val wateringGuideline: String,
  val soilMix: SoilMixSummaryResponse,
  val plantCount: Long,
  val description: String?,
  /** `sombra`, `semisombra`, `soleado` o `pleno_sol`; ausente si no está definida. */
  val sunExposure: String?,
  /** `interior`, `exterior` o `ambos`; ausente si no está definido. */
  val environment: String?,
  val bloomDescription: String?,
  val bloomColor: String?,
  val bloomMaturity: String?,
  val bloomTypicalDuration: String?,
  /** El calendario anual, siempre presente (vacío si no hay periodos), por tipo y mes de inicio. */
  val periods: List<SpeciesPeriodResponse>,
)

/** Un periodo del año. Inicio posterior al fin = cruza el fin de año. */
data class SpeciesPeriodResponse(
  val id: String,
  val type: String,
  val startMonth: Int,
  val endMonth: Int,
  /** Solo en el riego: `escaso`, `moderado` o `abundante`. */
  val intensity: String?,
  val notes: String?,
)

/** Un cambio de estado del historial de un ejemplar. */
data class PlantStatusChangeResponse(
  val id: String,
  val fromStatus: String,
  val toStatus: String,
  val reason: String?,
  val occurredAt: Instant,
)

/** Los valores que un ejemplar sobrescribe. Todos opcionales: ausente significa «hereda». */
data class CareOverridesResponse(
  val minHumidity: Int?,
  val maxHumidity: Int?,
  val minTemperature: Int?,
  val maxTemperature: Int?,
  val minLightHours: Int?,
  val maxLightHours: Int?,
  val wateringGuideline: String?,
  val soilMixId: String?,
)

/** El perfil de cuidados que se aplica a un ejemplar y de dónde viene cada valor. */
data class EffectiveCareResponse(
  val minHumidity: Int,
  val maxHumidity: Int,
  val minTemperature: Int,
  val maxTemperature: Int,
  val minLightHours: Int,
  val maxLightHours: Int,
  val wateringGuideline: String,
  val soilMix: SoilMixSummaryResponse,
  /** Los campos que se apartan de la especie: `minHumidity`, `wateringGuideline`, `soilMix`… */
  val overridden: List<String>,
)

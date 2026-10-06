package com.cactify.application.dto

import java.time.Instant

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
)

data class PlantSummaryResponse(
  val id: String,
  val code: String,
  val nickname: String,
  val createdAt: Instant?,
  val location: LocationResponse,
  val species: SpeciesSummaryResponse,
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
)

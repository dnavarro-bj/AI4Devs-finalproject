package com.cactify.application.dto

import java.time.Instant

/** Datos de cuidado que la planta hereda de su especie. */
data class SpeciesCareResponse(
  val id: String,
  val scientificName: String,
  val commonName: String,
  val minHumidity: Int,
  val maxHumidity: Int,
  val minTemperature: Int,
  val maxTemperature: Int,
  val minLightHours: Int,
  val maxLightHours: Int,
  val wateringGuideline: String,
)

/** Especie en el listado: sin los rangos de cuidado, que solo interesan en el detalle. */
data class SpeciesSummaryResponse(
  val id: String,
  val scientificName: String,
  val commonName: String,
)

data class PlantDetailResponse(
  val id: String,
  val nickname: String,
  val createdAt: Instant?,
  val location: LocationResponse,
  val species: SpeciesCareResponse,
  val tags: List<TagResponse>,
)

data class PlantSummaryResponse(
  val id: String,
  val nickname: String,
  val createdAt: Instant?,
  val location: LocationResponse,
  val species: SpeciesSummaryResponse,
)

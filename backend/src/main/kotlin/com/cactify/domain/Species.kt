package com.cactify.domain

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.EmbeddedId
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "species")
class Species(
  @EmbeddedId
  val id: SpeciesId = SpeciesId.create(),
  var scientificName: String,
  var commonName: String,
  var minHumidity: Int,
  var maxHumidity: Int,
  var minTemperature: Int,
  var maxTemperature: Int,
  var minLightHours: Int,
  var maxLightHours: Int,
  var wateringGuideline: String,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "soil_mix_id", nullable = false)
  var soilMix: SoilMix,
)

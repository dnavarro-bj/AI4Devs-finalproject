package com.cactify.domain

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.IdClass
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.io.Serializable

data class PlantTagId(
  var plant: Long = 0,
  var tag: Long = 0,
) : Serializable

@Entity
@Table(name = "plant_tag")
@IdClass(PlantTagId::class)
class PlantTag(
  @jakarta.persistence.Id
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", nullable = false)
  var plant: Plant,

  @jakarta.persistence.Id
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "tag_id", nullable = false)
  var tag: Tag,
)

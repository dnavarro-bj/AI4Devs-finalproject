package com.cactify.domain

import jakarta.persistence.Entity
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Table

@Entity
@Table(name = "location")
class Location(
  @EmbeddedId
  override val id: LocationId = LocationId.create(),
  var name: String,
) : AbstractEntity<LocationId>()

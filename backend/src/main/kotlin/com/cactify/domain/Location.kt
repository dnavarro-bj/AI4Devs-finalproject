package com.cactify.domain

import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "location")
class Location(
  @EmbeddedId
  override val id: LocationId = LocationId.create(),
  name: String,
) : AbstractEntity<LocationId>() {

  var name: String = name
    private set

  init {
    requireName(name)
  }

  /** Único camino para cambiar el nombre: revalida la invariante antes de tocar nada. */
  fun rename(name: String) {
    requireName(name)
    this.name = name
  }

  private fun requireName(value: String) =
    require(value.isNotBlank()) { "El nombre de la localización es obligatorio" }
}

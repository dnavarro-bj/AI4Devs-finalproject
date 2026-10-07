package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Un movimiento de un ejemplar: dónde estaba, dónde está y **cuándo cambió**.
 *
 * Inmutable —un historial no se reescribe— y construido por [Plant.moveTo] y por la edición de la
 * planta, que son los únicos caminos que cambian de sitio, de modo que la localización actual y el
 * historial no se desincronizan. Lleva lo que un evento de la futura cronología (T-20) necesitaría.
 */
@Entity
@Table(name = "plant_movement")
class PlantMovement internal constructor(
  @EmbeddedId
  override val id: PlantMovementId = PlantMovementId.create(),
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", nullable = false, updatable = false)
  val plant: Plant,
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "from_location_id", nullable = false, updatable = false)
  val fromLocation: Location,
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "to_location_id", nullable = false, updatable = false)
  val toLocation: Location,
  @Column(name = "moved_at", nullable = false, updatable = false)
  val movedAt: Instant,
) : AbstractEntity<PlantMovementId>() {

  init {
    require(fromLocation.id != toLocation.id) { "Un movimiento necesita dos localizaciones distintas" }
  }

  internal companion object {
    /** A microsegundos, la precisión que guarda la columna (ADR-010). */
    fun record(plant: Plant, from: Location, to: Location, at: Instant) =
      PlantMovement(plant = plant, fromLocation = from, toLocation = to, movedAt = at.truncatedTo(ChronoUnit.MICROS))
  }
}

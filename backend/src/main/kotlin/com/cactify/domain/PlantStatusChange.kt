package com.cactify.domain

import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Un cambio de estado de un ejemplar: de qué estado a cuál, por qué y **cuándo ocurrió**.
 *
 * Solo lo construye [Plant.changeStatus], que es lo que impide que el estado actual y su historial
 * se desincronicen: nacen del mismo método. Es inmutable —un historial no se reescribe— y lleva
 * todo lo que un evento de la futura cronología (T-20) necesitaría, de modo que esta tabla podrá
 * referenciarse desde allí sin migrar los datos.
 */
@Entity
@Table(name = "plant_status_change")
class PlantStatusChange internal constructor(
  @EmbeddedId
  override val id: PlantStatusChangeId = PlantStatusChangeId.create(),
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", nullable = false, updatable = false)
  val plant: Plant,
  @jakarta.persistence.Column(name = "from_status", nullable = false, updatable = false)
  val fromStatus: PlantStatus,
  @jakarta.persistence.Column(name = "to_status", nullable = false, updatable = false)
  val toStatus: PlantStatus,
  @jakarta.persistence.Column(name = "reason", updatable = false)
  val reason: String?,
  @jakarta.persistence.Column(name = "occurred_at", nullable = false, updatable = false)
  val occurredAt: Instant,
) : AbstractEntity<PlantStatusChangeId>() {

  init {
    require(fromStatus != toStatus) { "Un cambio de estado necesita dos estados distintos" }
  }

  internal companion object {
    /** A microsegundos, la precisión que guarda la columna (ADR-010). */
    fun record(plant: Plant, from: PlantStatus, to: PlantStatus, reason: String?, at: Instant) =
      PlantStatusChange(plant = plant, fromStatus = from, toStatus = to, reason = reason, occurredAt = at.truncatedTo(ChronoUnit.MICROS))
  }
}

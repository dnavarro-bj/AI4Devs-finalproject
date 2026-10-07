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
 * Un paso del historial de una alerta: de qué estado a cuál, con qué comentario y cuándo. **La
 * apertura es la primera** y no tiene estado anterior. Inmutable —un historial no se reescribe— y
 * construido solo por [Alert], de modo que el estado actual y su historial nacen del mismo método y
 * no pueden desincronizarse (como `PlantStatusChange`).
 *
 * La cronología del ejemplar lo lee de aquí, sin copiarlo a `plant_event`.
 */
@Entity
@Table(name = "alert_transition")
class AlertTransition internal constructor(
  @EmbeddedId
  override val id: AlertTransitionId = AlertTransitionId.create(),
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "alert_id", nullable = false, updatable = false)
  val alert: Alert,
  @Column(name = "from_status", updatable = false)
  val fromStatus: AlertStatus?,
  @Column(name = "to_status", nullable = false, updatable = false)
  val toStatus: AlertStatus,
  @Column(name = "comment", updatable = false)
  val comment: String?,
  @Column(name = "occurred_at", nullable = false, updatable = false)
  val occurredAt: Instant,
) : AbstractEntity<AlertTransitionId>() {

  init {
    require((fromStatus == null) == (toStatus == AlertStatus.New)) {
      "Solo la apertura carece de estado anterior, y toda apertura lleva la alerta a 'nueva'"
    }
    require(fromStatus == null || fromStatus != toStatus) { "Una transición necesita dos estados distintos" }
  }

  internal companion object {
    /** A microsegundos, la precisión que guarda la columna (ADR-010). */
    fun record(alert: Alert, from: AlertStatus?, to: AlertStatus, comment: String?, at: Instant) =
      AlertTransition(alert = alert, fromStatus = from, toStatus = to, comment = comment, occurredAt = at.truncatedTo(ChronoUnit.MICROS))
  }
}

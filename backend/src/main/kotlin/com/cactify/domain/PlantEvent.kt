package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorColumn
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Inheritance
import jakarta.persistence.InheritanceType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * La espina de los eventos que se crean desde la ficha: comentario, intervención y floración. Las
 * lecturas, los cambios de estado y los movimientos **no** pasan por aquí —viven en sus tablas y la
 * cronología los une al leer—.
 *
 * Herencia `JOINED` con `event_type` como discriminador: cada subclase vive en su tabla satélite,
 * con la clave del evento como clave primaria y foránea. El instante es el del evento, no el del
 * registro; los hijos lo validan contra el [Clock] único antes de asignar (ADR-011).
 */
@Entity
@Table(name = "plant_event")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "event_type")
abstract class PlantEvent(
  @EmbeddedId
  override val id: PlantEventId = PlantEventId.create(),
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", nullable = false, updatable = false)
  val plant: Plant,
  occurredAt: Instant,
) : AbstractEntity<PlantEventId>() {

  @Column(name = "occurred_at", nullable = false)
  var occurredAt: Instant = occurredAt.truncatedTo(ChronoUnit.MICROS)
    protected set

  /** La operación única que lo originó cuando se aplicó a varias plantas. Nadie la escribe todavía (T-24). */
  @Column(name = "batch_id", updatable = false, insertable = false)
  var batchId: Long? = null
    protected set

  protected companion object {
    /** El instante dado, o el del reloj; nunca posterior al reloj más el margen. */
    fun stamp(at: Instant?, clock: Clock, maxFutureSkew: Duration, what: String): Instant {
      val stamped = (at ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
      require(!stamped.isAfter(clock.instant().plus(maxFutureSkew))) { "La fecha $what no puede estar en el futuro" }
      return stamped
    }

    fun String?.cleaned(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
  }
}

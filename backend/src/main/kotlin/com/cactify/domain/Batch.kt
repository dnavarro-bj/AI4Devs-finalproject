package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

/** Qué se hizo en un lote (ADR-007): el tipo de registro que cada planta afectada recibió. */
enum class BatchAction(val value: String) {
  Reading("lectura"),
  Intervention("intervencion"),
  Comment("comentario"),
  ;

  companion object {
    operator fun invoke(value: String): BatchAction =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una acción de lote válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** Cómo se eligieron las plantas de un lote (ADR-007): una lista, una localización o el resultado de un filtro. */
enum class BatchScopeKind(val value: String) {
  Plants("plantas"),
  Location("localizacion"),
  Query("consulta"),
  ;

  companion object {
    operator fun invoke(value: String): BatchScopeKind =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de alcance válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/**
 * Una operación aplicada a varias plantas a la vez. Cada planta afectada tiene **su propio registro**
 * (una lectura, una intervención o un comentario) con el `batch_id` de esta fila; la operación solo
 * guarda lo que no se puede deducir de ellos: qué se hizo, cómo se eligió el alcance, **a cuántas
 * plantas** se aplicó de verdad y cuándo. No guarda las plantas: están en los registros.
 *
 * Es inmutable: lo que se hizo, se hizo. Se construye con [record], que valida antes de asignar
 * (ADR-011) y juzga la fecha contra el reloj único.
 */
@Entity
@Table(name = "batch")
@BatchSize(size = 50)
class Batch private constructor(
  @EmbeddedId
  override val id: BatchId = BatchId.create(),
  action: BatchAction,
  scopeKind: BatchScopeKind,
  plantCount: Int,
  occurredAt: Instant,
) : AbstractEntity<BatchId>() {

  @Column(name = "action", nullable = false, updatable = false)
  var action: BatchAction = action
    private set

  @Column(name = "scope_kind", nullable = false, updatable = false)
  var scopeKind: BatchScopeKind = scopeKind
    private set

  @Column(name = "plant_count", nullable = false, updatable = false)
  var plantCount: Int = plantCount
    private set

  @Column(name = "occurred_at", nullable = false, updatable = false)
  var occurredAt: Instant = occurredAt
    private set

  companion object {
    /** El instante dado, o el del reloj; nunca posterior al reloj más el margen. Lo comparten el lote y sus registros. */
    fun record(
      action: BatchAction,
      scopeKind: BatchScopeKind,
      plantCount: Int,
      occurredAt: Instant?,
      clock: Clock,
      maxFutureSkew: Duration,
    ): Batch {
      require(plantCount >= 1) { "Un lote afecta al menos a una planta" }
      val stamped = (occurredAt ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)
      require(!stamped.isAfter(clock.instant().plus(maxFutureSkew))) { "La fecha del lote no puede estar en el futuro" }
      return Batch(action = action, scopeKind = scopeKind, plantCount = plantCount, occurredAt = stamped)
    }
  }
}

package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit

/** Una transición que el ciclo de vida no admite: depende del estado actual de la alerta, así que es `409`. */
class InvalidAlertTransitionException(from: AlertStatus, to: AlertStatus) : RuntimeException(
  when {
    !from.isOpen -> "La alerta ya está '$from' y no admite más cambios"
    from == to -> "La alerta ya está '$to'"
    else -> "No se puede pasar de '$from' a '$to'"
  },
)

/** Una alerta abierta y el primer paso de su historial: nacen juntas. */
data class OpenedAlert(val alert: Alert, val transition: AlertTransition)

/**
 * Una incidencia operativa con ciclo de vida propio (§17): señala un riesgo y se cierra siempre por
 * una persona. **No es una tarea ni un cuidado**.
 *
 * Afecta a **una planta o a una localización**, nunca a las dos ni a ninguna. Mientras está abierta
 * una misma condición no se duplica: cada nueva detección la **acumula** ([recordOccurrence]) y su
 * severidad sube pero nunca baja. Resuelta y descartada son finales y se distinguen por su estado.
 *
 * La entidad es dueña de su consistencia (ADR-011): todo cambio pasa por un método que valida **antes
 * de asignar**, y las transiciones devuelven el [AlertTransition] que el servicio guarda.
 */
@Entity
@Table(name = "alert")
class Alert private constructor(
  @EmbeddedId
  override val id: AlertId = AlertId.create(),
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plant_id", updatable = false)
  val plant: Plant?,
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "location_id", updatable = false)
  val location: Location?,
  @Column(name = "source", nullable = false, updatable = false)
  val source: AlertSource,
  @Column(name = "category", nullable = false, updatable = false)
  val category: AlertCategory,
  severity: AlertSeverity,
  reason: String,
  recommendedAction: String?,
  careRecord: CareRecord?,
  @Column(name = "detected_at", nullable = false, updatable = false)
  val detectedAt: Instant,
) : AbstractEntity<AlertId>() {

  @Column(name = "severity", nullable = false)
  var severity: AlertSeverity = severity
    private set

  /** El orden de la severidad, calculado por la base: es lo que permite ordenar sin un `CASE`. */
  @Column(name = "severity_rank", insertable = false, updatable = false)
  var severityRank: Int? = null
    private set

  @Column(name = "status", nullable = false)
  var status: AlertStatus = AlertStatus.New
    private set

  @Column(name = "reason", nullable = false)
  var reason: String = reason
    private set

  @Column(name = "recommended_action")
  var recommendedAction: String? = recommendedAction
    private set

  /** La **última** lectura que confirma la condición; la primera está en la apertura. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "care_record_id")
  var careRecord: CareRecord? = careRecord
    private set

  @Column(name = "last_detected_at", nullable = false)
  var lastDetectedAt: Instant = detectedAt
    private set

  @Column(name = "occurrences", nullable = false)
  var occurrences: Int = 1
    private set

  @Column(name = "closed_at")
  var closedAt: Instant? = null
    private set

  @Column(name = "closure_comment")
  var closureComment: String? = null
    private set

  init {
    require((plant == null) != (location == null)) { "Una alerta afecta a una planta o a una localización, no a las dos ni a ninguna" }
    require(reason.isNotBlank()) { "El motivo de la alerta no puede estar en blanco" }
  }

  /** `nueva → revisada`. */
  fun review(comment: String?, clock: Clock): AlertTransition = moveTo(AlertStatus.Reviewed, comment, clock)

  /** Cierra la alerta como resuelta: la condición se atendió. */
  fun resolve(comment: String?, clock: Clock): AlertTransition = moveTo(AlertStatus.Resolved, comment, clock)

  /** Cierra la alerta como descartada: no es resolver, y se distingue por su estado. */
  fun dismiss(comment: String?, clock: Clock): AlertTransition = moveTo(AlertStatus.Dismissed, comment, clock)

  private fun moveTo(target: AlertStatus, comment: String?, clock: Clock): AlertTransition {
    if (!status.canMoveTo(target)) throw InvalidAlertTransitionException(status, target)
    val at = clock.instant().truncatedTo(ChronoUnit.MICROS)
    val clean = comment.cleaned()
    val from = status
    status = target
    if (!target.isOpen) {
      closedAt = at
      closureComment = clean
    }
    return AlertTransition.record(this, from, target, clean, at)
  }

  /**
   * Una nueva detección de la misma condición sobre una alerta **abierta**: suma una ocurrencia,
   * mueve la última detección —nunca hacia atrás—, enlaza la lectura que la confirma y **escala** la
   * severidad al mayor entre la actual, la de esta detección y la que imponen las ocurrencias.
   */
  fun recordOccurrence(severityOfDetection: AlertSeverity, careRecord: CareRecord?, at: Instant, thresholds: AlertThresholds) {
    check(status.isOpen) { "Una alerta cerrada no recibe ocurrencias: la condición abre otra alerta" }
    val next = occurrences + 1
    occurrences = next
    lastDetectedAt = maxOf(lastDetectedAt, at.truncatedTo(ChronoUnit.MICROS))
    if (careRecord != null) this.careRecord = careRecord
    severity = AlertSeverity.max(AlertSeverity.max(severity, severityOfDetection), thresholds.severityByOccurrences(next))
  }

  /**
   * La IA enriquece la explicación: sustituye la acción recomendada y añade su texto al motivo, sin
   * cambiar el origen, el estado ni la severidad.
   */
  fun enrich(action: String?, explanation: String) {
    action.cleaned()?.let { recommendedAction = it }
    explanation.cleaned()?.let { reason = "$reason · $it".take(MAX_REASON) }
  }

  companion object {
    const val MAX_REASON = 2000

    /** Única forma de abrir una alerta: nueva, con una ocurrencia y su transición de apertura. */
    fun open(
      plant: Plant?,
      location: Location?,
      source: AlertSource,
      category: AlertCategory,
      severity: AlertSeverity,
      reason: String,
      recommendedAction: String?,
      careRecord: CareRecord?,
      clock: Clock,
    ): OpenedAlert {
      val at = clock.instant().truncatedTo(ChronoUnit.MICROS)
      val alert = Alert(
        plant = plant,
        location = location,
        source = source,
        category = category,
        severity = severity,
        reason = reason.trim().also { require(it.length <= MAX_REASON) { "El motivo no puede pasar de $MAX_REASON caracteres" } },
        recommendedAction = recommendedAction.cleaned(),
        careRecord = careRecord,
        detectedAt = at,
      )
      return OpenedAlert(alert, AlertTransition.record(alert, null, AlertStatus.New, null, at))
    }

    private fun String?.cleaned(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
  }
}

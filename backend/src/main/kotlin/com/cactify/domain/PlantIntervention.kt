package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Clock
import java.time.Duration
import java.time.Instant

/**
 * Algo que se le hizo al ejemplar: trasplante, cambio de sustrato, tratamiento, fertilización, poda
 * o revisión. Es un hecho ocurrido, no una tarea (y no una lectura): no necesita ninguna previa.
 *
 * **Cada tipo admite solo sus datos**: la maceta en el trasplante, la mezcla en el cambio de
 * sustrato, el producto en el tratamiento y la fertilización. Lo valida [checkData] antes de asignar
 * (ADR-011) y la base lo repite con `CHECK`.
 */
@Entity
@Table(name = "plant_intervention")
@DiscriminatorValue("intervencion")
class PlantIntervention private constructor(
  plant: Plant,
  type: InterventionType,
  product: String?,
  potSize: String?,
  soilMix: SoilMix?,
  notes: String?,
  occurredAt: Instant,
  task: Task? = null,
  batch: Batch? = null,
) : PlantEvent(plant = plant, occurredAt = occurredAt, batch = batch) {

  @Column(name = "intervention_type", nullable = false)
  var type: InterventionType = type
    private set

  var product: String? = product
    private set

  @Column(name = "pot_size")
  var potSize: String? = potSize
    private set

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "soil_mix_id")
  var soilMix: SoilMix? = soilMix
    private set

  var notes: String? = notes
    private set

  /** La tarea que se completó al registrarla, si la hay. Solo la establece completar una tarea. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", updatable = false)
  var task: Task? = task
    private set

  /** Reemplazo completo. Sin fecha nueva conserva la que tenía. Valida **antes** de asignar. */
  fun replace(
    type: InterventionType,
    product: String?,
    potSize: String?,
    soilMix: SoilMix?,
    notes: String?,
    occurredAt: Instant?,
    clock: Clock,
    maxFutureSkew: Duration,
  ) {
    val cleanProduct = product.cleaned()
    val cleanPot = potSize.cleaned()
    checkData(type, cleanProduct, cleanPot, soilMix)
    val stamped = occurredAt?.let { stamp(it, clock, maxFutureSkew, "de la intervención") } ?: this.occurredAt
    this.type = type
    this.product = cleanProduct
    this.potSize = cleanPot
    this.soilMix = soilMix
    this.notes = notes.cleaned()
    this.occurredAt = stamped
  }

  companion object {
    fun record(
      plant: Plant,
      type: InterventionType,
      product: String?,
      potSize: String?,
      soilMix: SoilMix?,
      notes: String?,
      occurredAt: Instant?,
      clock: Clock,
      maxFutureSkew: Duration,
      task: Task? = null,
      batch: Batch? = null,
    ): PlantIntervention {
      val cleanProduct = product.cleaned()
      val cleanPot = potSize.cleaned()
      checkData(type, cleanProduct, cleanPot, soilMix)
      return PlantIntervention(
        plant, type, cleanProduct, cleanPot, soilMix, notes.cleaned(),
        stamp(occurredAt, clock, maxFutureSkew, "de la intervención"),
        task,
        batch,
      )
    }

    private fun checkData(type: InterventionType, product: String?, potSize: String?, soilMix: SoilMix?) {
      require(potSize == null || type == InterventionType.Transplant) {
        "potSize solo corresponde a un trasplante, no a '$type'"
      }
      require(soilMix == null || type == InterventionType.Substrate) {
        "soilMixId solo corresponde a un cambio de sustrato, no a '$type'"
      }
      require(product == null || type == InterventionType.Treatment || type == InterventionType.Fertilization) {
        "product solo corresponde a un tratamiento o una fertilización, no a '$type'"
      }
    }
  }
}

package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

/**
 * Un periodo del año de una especie. **El año es un ciclo**: un inicio posterior al fin significa
 * que el periodo cruza el fin de año (noviembre a febrero = 11→2), y es **un** periodo, no dos.
 *
 * Es inmutable y solo lo construye [Species], que es quien valida el conjunto: la especie es el
 * agregado y el periodo no tiene repositorio.
 */
@Entity
@Table(name = "species_period")
class SpeciesPeriod internal constructor(
  @EmbeddedId
  override val id: SpeciesPeriodId = SpeciesPeriodId.create(),
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "species_id", nullable = false, updatable = false)
  val species: Species,
  @Column(name = "period_type", nullable = false, updatable = false)
  val type: PeriodType,
  @Column(name = "start_month", nullable = false, updatable = false)
  val startMonth: Int,
  @Column(name = "end_month", nullable = false, updatable = false)
  val endMonth: Int,
  @Column(name = "intensity", updatable = false)
  val intensity: WateringIntensity?,
  @Column(name = "notes", updatable = false)
  val notes: String?,
) : AbstractEntity<SpeciesPeriodId>() {

  /** Los meses (1–12) que cubre, contando el cruce del fin de año. */
  val months: Set<Int> get() = PeriodSpec(type, startMonth, endMonth, intensity, notes).months
}

/**
 * Un periodo tal y como entra: sin identidad ni especie. Valida **al construirse**, así que un
 * `PeriodSpec` existente es siempre coherente.
 */
data class PeriodSpec(
  val type: PeriodType,
  val startMonth: Int,
  val endMonth: Int,
  val intensity: WateringIntensity? = null,
  val notes: String? = null,
) {
  init {
    require(startMonth in 1..12) { "El mes de inicio del periodo debe estar entre 1 y 12" }
    require(endMonth in 1..12) { "El mes de fin del periodo debe estar entre 1 y 12" }
    if (type == PeriodType.Watering) {
      require(intensity != null) { "El periodo de riego necesita una intensidad" }
    } else {
      require(intensity == null) { "Solo el periodo de riego lleva intensidad" }
    }
  }

  /** Los meses que cubre. Con inicio > fin recorre diciembre: 11→2 son nov, dic, ene, feb. */
  val months: Set<Int>
    get() = if (startMonth <= endMonth) {
      (startMonth..endMonth).toSet()
    } else {
      ((startMonth..12) + (1..endMonth)).toSet()
    }

  /** Normaliza las notas: sin espacios en los extremos y vacías como ausentes. */
  fun normalized(): PeriodSpec = copy(notes = notes?.trim()?.takeIf { it.isNotEmpty() })
}

/**
 * El calendario completo de una especie. Dentro de un mismo tipo los periodos **no se solapan**,
 * y eso cuenta el cruce del año: nov–feb y ene–mar chocan en enero. Entre tipos distintos coinciden
 * libremente: crecer y florecer a la vez es lo normal. La única dependencia entre tipos es el
 * **crecimiento máximo**, que se superpone al crecimiento y por tanto debe caer **dentro** de él:
 * «crece más» en un mes en que no crece no tiene sentido.
 */
internal object SpeciesCalendar {
  fun requireCoherent(periods: List<PeriodSpec>) {
    for ((type, ofType) in periods.groupBy { it.type }) {
      val taken = mutableSetOf<Int>()
      for (period in ofType) {
        val clash = period.months.intersect(taken)
        require(clash.isEmpty()) {
          "Los periodos de ${type.value} se solapan en ${clash.sorted().joinToString { MONTH_NAMES[it - 1] }}"
        }
        taken += period.months
      }
    }

    val growth = periods.filter { it.type == PeriodType.Growth }.flatMap { it.months }.toSet()
    val outside = periods.filter { it.type == PeriodType.GrowthPeak }.flatMap { it.months }.toSet() - growth
    require(outside.isEmpty()) {
      "El crecimiento máximo debe caer dentro del periodo de crecimiento; fuera de él: " +
        outside.sorted().joinToString { MONTH_NAMES[it - 1] }
    }
  }

  private val MONTH_NAMES = listOf(
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  )
}

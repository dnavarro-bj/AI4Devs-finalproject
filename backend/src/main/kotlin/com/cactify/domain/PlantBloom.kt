package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Una floración **observada**: un intervalo con inicio y fin opcional. Puede seguir abierta. No es la
 * floración esperada de la especie —son datos distintos y la una no modifica la otra—.
 *
 * Su instante en la cronología es el inicio a las 00:00 UTC, fijado aquí para que `occurredAt` y
 * `startedOn` no puedan divergir.
 */
@Entity
@Table(name = "plant_bloom")
@DiscriminatorValue("floracion")
class PlantBloom private constructor(
  plant: Plant,
  startedOn: LocalDate,
  endedOn: LocalDate?,
  status: BloomStatus,
  flowerCount: Int?,
  notes: String?,
) : PlantEvent(plant = plant, occurredAt = startOf(startedOn)) {

  @Column(name = "started_on", nullable = false)
  var startedOn: LocalDate = startedOn
    private set

  @Column(name = "ended_on")
  var endedOn: LocalDate? = endedOn
    private set

  @Column(name = "bloom_status", nullable = false)
  var status: BloomStatus = status
    private set

  @Column(name = "flower_count")
  var flowerCount: Int? = flowerCount
    private set

  var notes: String? = notes
    private set

  /** Reemplazo completo; valida **antes** de asignar. */
  fun replace(startedOn: LocalDate, endedOn: LocalDate?, status: BloomStatus, flowerCount: Int?, notes: String?, clock: Clock) {
    check(startedOn, endedOn, status, flowerCount, clock)
    this.startedOn = startedOn
    this.endedOn = endedOn
    this.status = status
    this.flowerCount = flowerCount
    this.notes = notes.cleaned()
    this.occurredAt = startOf(startedOn)
  }

  companion object {
    fun record(
      plant: Plant,
      startedOn: LocalDate,
      endedOn: LocalDate?,
      status: BloomStatus,
      flowerCount: Int?,
      notes: String?,
      clock: Clock,
    ): PlantBloom {
      check(startedOn, endedOn, status, flowerCount, clock)
      return PlantBloom(plant, startedOn, endedOn, status, flowerCount, notes.cleaned())
    }

    private fun startOf(day: LocalDate): Instant = day.atStartOfDay().toInstant(ZoneOffset.UTC)

    private fun check(startedOn: LocalDate, endedOn: LocalDate?, status: BloomStatus, flowerCount: Int?, clock: Clock) {
      val today = LocalDate.now(clock.withZone(ZoneOffset.UTC))
      require(!startedOn.isAfter(today)) { "La fecha de inicio de la floración no puede estar en el futuro" }
      require(endedOn == null || !endedOn.isAfter(today)) { "La fecha de fin de la floración no puede estar en el futuro" }
      require(endedOn == null || !endedOn.isBefore(startedOn)) { "El fin de la floración no puede ser anterior a su inicio" }
      require((status == BloomStatus.Finished) == (endedOn != null)) {
        if (status == BloomStatus.Finished) "Una floración finalizada necesita fecha de fin"
        else "Solo una floración finalizada admite fecha de fin"
      }
      require(flowerCount == null || flowerCount >= 0) { "El número de flores no puede ser negativo" }
    }
  }
}

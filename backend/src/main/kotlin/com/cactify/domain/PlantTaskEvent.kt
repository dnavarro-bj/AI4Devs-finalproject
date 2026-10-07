package com.cactify.domain

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
 * Una tarea completada, en la historia de **una** planta: el rastro de que se hizo. Completar una
 * tarea de grupo escribe uno por planta incluida y ninguno por las excluidas. Omitir y cancelar no
 * escriben nada. No se edita ni se borra desde la ficha: es consecuencia de la tarea, no una nota.
 *
 * Es un satélite más de la espina `plant_event`: hereda su instante y su orden, y la cronología lo
 * recoge sin tocar su unión.
 */
@Entity
@Table(name = "plant_task_event")
@DiscriminatorValue("tarea")
class PlantTaskEvent private constructor(
  plant: Plant,
  task: Task,
  occurredAt: Instant,
) : PlantEvent(plant = plant, occurredAt = occurredAt) {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false, updatable = false)
  var task: Task = task
    private set

  companion object {
    /** La finalización: la que dio quien completó, o la del reloj; nunca posterior al reloj más el margen. */
    fun record(plant: Plant, task: Task, occurredAt: Instant?, clock: Clock, maxFutureSkew: Duration): PlantTaskEvent =
      PlantTaskEvent(plant, task, stamp(occurredAt, clock, maxFutureSkew, "de finalización de la tarea"))

    /** El instante de una finalización, validado: lo comparten el evento, la lectura y la propia tarea. */
    fun stampCompletion(at: Instant?, clock: Clock, maxFutureSkew: Duration): Instant =
      stamp(at, clock, maxFutureSkew, "de finalización de la tarea")
  }
}

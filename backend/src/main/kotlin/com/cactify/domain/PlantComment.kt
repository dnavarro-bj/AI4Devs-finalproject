package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

/** Una anotación libre sobre el ejemplar. Se puede corregir —y entonces queda marcada— y retirar. */
@Entity
@Table(name = "plant_comment")
@DiscriminatorValue("comentario")
class PlantComment private constructor(plant: Plant, text: String, occurredAt: Instant) :
  PlantEvent(plant = plant, occurredAt = occurredAt) {

  @Column(name = "text", nullable = false)
  var text: String = text
    private set

  @Column(name = "edited_at")
  var editedAt: Instant? = null
    private set

  /** Corregir cambia el texto y marca la edición; el instante del comentario no se mueve. */
  fun edit(newText: String, clock: Clock) {
    val cleaned = requireText(newText)
    text = cleaned
    editedAt = clock.instant().truncatedTo(ChronoUnit.MICROS)
  }

  companion object {
    fun record(plant: Plant, text: String, occurredAt: Instant?, clock: Clock, maxFutureSkew: Duration): PlantComment {
      val cleaned = requireText(text)
      return PlantComment(plant, cleaned, stamp(occurredAt, clock, maxFutureSkew, "del comentario"))
    }

    private fun requireText(text: String): String {
      val cleaned = text.trim()
      require(cleaned.isNotEmpty()) { "El texto del comentario no puede estar en blanco" }
      return cleaned
    }
  }
}

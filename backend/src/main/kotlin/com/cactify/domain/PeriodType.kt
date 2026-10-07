package com.cactify.domain

/**
 * Qué describe un periodo del calendario anual de una especie (ADR-007).
 *
 * `GrowthPeak` es **el crecimiento máximo**: los meses en los que la especie más crece. Se superpone
 * al crecimiento —no lo sustituye— y por eso debe caer dentro de él (ver [SpeciesCalendar]).
 */
enum class PeriodType(val value: String) {
  Growth("crecimiento"),
  GrowthPeak("crecimiento_maximo"),
  Dormancy("reposo"),
  Flowering("floracion"),
  Watering("riego"),
  ;

  companion object {
    operator fun invoke(value: String): PeriodType =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de periodo válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

/** La intensidad orientativa del riego en un periodo (ADR-007). Solo el riego la lleva. */
enum class WateringIntensity(val value: String) {
  Sparse("escaso"),
  Moderate("moderado"),
  Abundant("abundante"),
  ;

  companion object {
    operator fun invoke(value: String): WateringIntensity =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una intensidad válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

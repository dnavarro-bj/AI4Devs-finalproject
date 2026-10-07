package com.cactify.domain

/**
 * Cuánto y hacia dónde se aparta una medida de su rango. Es **puro**: no sabe de plantas ni de
 * alertas, solo de una medida y sus extremos.
 *
 * La [distance] es proporcional a la **anchura** del rango —una temperatura 5 °C por debajo no es lo
 * mismo en un rango de 10 que en uno de 40—; un rango degenerado (`min = max`) usa 1 como anchura para
 * no dividir por cero. Un extremo ausente no se evalúa: sin mínimo no hay «por debajo».
 */
data class RangeDeviation(val direction: Direction, val limit: Int, val distance: Double) {

  enum class Direction { Below, Above }

  companion object {
    /** `null` si la medida está dentro del rango (los extremos incluidos) o no hay extremo que mirar. */
    fun of(value: Int, min: Int?, max: Int?): RangeDeviation? {
      val width = if (min != null && max != null && max > min) (max - min).toDouble() else 1.0
      return when {
        min != null && value < min -> RangeDeviation(Direction.Below, min, (min - value) / width)
        max != null && value > max -> RangeDeviation(Direction.Above, max, (value - max) / width)
        else -> null
      }
    }
  }
}

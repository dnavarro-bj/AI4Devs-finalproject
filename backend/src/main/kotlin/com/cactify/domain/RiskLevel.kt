package com.cactify.domain

/**
 * Nivel de riesgo que la IA asigna a una lectura (ADR-007).
 *
 * El valor persistido va en inglés como el resto de identificadores del proyecto; la etiqueta que
 * ve el usuario la pone el frontend, que es quien sabe en qué idioma habla.
 */
enum class RiskLevel(val value: String) {
  Low("low"),
  Medium("medium"),
  High("high"),
  ;

  companion object {
    operator fun invoke(value: String): RiskLevel =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("$value no es un nivel de riesgo válido")
  }

  override fun toString(): String = value
}

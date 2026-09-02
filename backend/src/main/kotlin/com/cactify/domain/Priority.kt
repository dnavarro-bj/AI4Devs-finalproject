package com.cactify.domain

/**
 * Prioridad de actuación de una recomendación (ADR-007): **cuándo** hay que actuar.
 *
 * Deliberadamente no comparte escala con [RiskLevel]: si ambos usaran `low`/`medium`/`high`, la
 * prioridad sería una copia del riesgo y no valdría la columna que cuesta.
 */
enum class Priority(val value: String) {
  Immediate("immediate"),
  Soon("soon"),
  Routine("routine"),
  ;

  companion object {
    operator fun invoke(value: String): Priority =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("$value no es una prioridad válida")
  }

  override fun toString(): String = value
}

package com.cactify.domain

/**
 * El entorno que ofrece un sitio (ADR-007). Describe el sitio, no lo que tolera una planta: por eso
 * es un tipo distinto de [Environment], el de la especie, y tiene «cubierto».
 */
enum class LocationEnvironment(val value: String) {
  Indoor("interior"),
  Covered("cubierto"),
  Outdoor("exterior"),
  ;

  companion object {
    operator fun invoke(value: String): LocationEnvironment =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un entorno de localización válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

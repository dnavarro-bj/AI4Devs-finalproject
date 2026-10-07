package com.cactify.domain

/**
 * Dónde se cultiva una especie (ADR-007). Tres valores: la estacionalidad —que cambia según la
 * época— la expresan los periodos del calendario, no un cuarto valor.
 */
enum class Environment(val value: String) {
  Indoor("interior"),
  Outdoor("exterior"),
  Both("ambos"),
  ;

  companion object {
    operator fun invoke(value: String): Environment =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un entorno válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

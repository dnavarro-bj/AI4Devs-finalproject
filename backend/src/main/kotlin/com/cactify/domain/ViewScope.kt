package com.cactify.domain

/**
 * A qué listado pertenece una vista guardada (ADR-007). El ámbito decide contra qué criterios se
 * valida la consulta y si admite columnas: solo la tabla del inventario las configura.
 */
enum class ViewScope(val value: String) {
  Plants("plants"),
  Species("species"),
  ;

  companion object {
    operator fun invoke(value: String): ViewScope =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un ámbito válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

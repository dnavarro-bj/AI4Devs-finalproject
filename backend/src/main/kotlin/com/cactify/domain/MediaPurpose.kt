package com.cactify.domain

/** Para qué se hizo la fotografía de un ejemplar (ADR-007). Opcional: una foto sin propósito es válida. */
enum class MediaPurpose(val value: String) {
  General("general"),
  Detail("detalle"),
  PhysicalLabel("etiqueta_fisica"),
  ;

  companion object {
    operator fun invoke(value: String): MediaPurpose =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un propósito válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

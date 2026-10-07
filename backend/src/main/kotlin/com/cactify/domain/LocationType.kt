package com.cactify.domain

/**
 * Qué clase de sitio es una localización (ADR-007). Es una etiqueta para reconocer y agrupar, no una
 * regla: la jerarquía no depende del tipo.
 */
enum class LocationType(val value: String) {
  Bench("bancada"),
  Tray("bandeja"),
  Greenhouse("invernadero"),
  OutdoorArea("zona_exterior"),
  Shelf("estanteria"),
  Other("otro"),
  ;

  companion object {
    operator fun invoke(value: String): LocationType =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es un tipo de localización válido: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

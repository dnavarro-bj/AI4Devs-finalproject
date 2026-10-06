package com.cactify.domain

/**
 * De dónde llegó un ejemplar (ADR-007): una lista cerrada, que permite filtrar y contar, más una
 * nota libre con el detalle. `Other` existe porque una lista cerrada sin salida obliga a mentir en
 * el primer caso que no prevé.
 */
enum class PlantOrigin(val value: String) {
  Nursery("vivero"),
  Exchange("intercambio"),
  OwnGermination("germinacion_propia"),
  Purchase("compra"),
  Gift("regalo"),
  Other("otro"),
  ;

  companion object {
    operator fun invoke(value: String): PlantOrigin =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una procedencia válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

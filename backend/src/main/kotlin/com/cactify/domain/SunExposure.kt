package com.cactify.domain

/**
 * Cómo recibe la luz una especie (ADR-007): la **forma** de recibirla, no su duración —eso son las
 * horas de luz, un dato independiente—. No hay umbral numérico que distinga «soleado» de «pleno
 * sol»: la definición funcional la muestra la interfaz.
 */
enum class SunExposure(val value: String) {
  Shade("sombra"),
  PartialShade("semisombra"),
  Sunny("soleado"),
  FullSun("pleno_sol"),
  ;

  companion object {
    operator fun invoke(value: String): SunExposure =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una exposición válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

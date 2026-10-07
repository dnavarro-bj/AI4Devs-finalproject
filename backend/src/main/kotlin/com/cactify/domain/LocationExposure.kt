package com.cactify.domain

/**
 * La exposición solar predominante de un sitio (ADR-007). Repite los valores de [SunExposure] pero es
 * un tipo distinto: una cosa es lo que ofrece el sitio y otra lo que tolera la planta.
 */
enum class LocationExposure(val value: String) {
  Shade("sombra"),
  PartialShade("semisombra"),
  Sunny("soleado"),
  FullSun("pleno_sol"),
  ;

  companion object {
    operator fun invoke(value: String): LocationExposure =
      entries.find { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("'$value' no es una exposición de localización válida: ${entries.joinToString { it.value }}")
  }

  override fun toString(): String = value
}

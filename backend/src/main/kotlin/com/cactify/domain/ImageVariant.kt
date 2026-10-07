package com.cactify.domain

/** Los tres tamaños de cada fotografía (ADR-018, decisión 3): se generan una vez, al subir. */
enum class ImageVariant(val value: String) {
  Thumb("thumb"),
  Medium("medium"),
  Full("full"),
  ;

  companion object {
    /** `null` ante una variante desconocida: servirla es un 404, no un dato inválido del cuerpo. */
    fun find(value: String): ImageVariant? = entries.find { it.value == value }

    /** La clave de una variante dentro de la carpeta de su fotografía. */
    fun keyOf(folder: String, variant: ImageVariant): String = "$folder/${variant.value}"
  }

  override fun toString(): String = value
}

package com.cactify.application

import java.time.Duration

/**
 * Los límites de las fotografías (ADR-018, decisión 6), ya validados. Los valores por defecto son los
 * del producto y se leen de `cactify.media.*`. Una configuración incoherente lanza al construirse y
 * **impide arrancar**: mejor un fallo al inicio que una imagen `medium` más grande que la `full`.
 */
data class MediaLimits(
  /** Tamaño máximo de un archivo subido, en bytes. */
  val maxFileBytes: Long = 10L * 1024 * 1024,
  /** Archivos por subida. */
  val maxFiles: Int = 10,
  /** Fotografías por dueño (especie o ejemplar). */
  val maxPerOwner: Int = 50,
  /** Píxeles máximos de una imagen subida: la defensa contra una imagen que desborde la memoria. */
  val maxPixels: Long = 50_000_000,
  /** Lado mayor, en píxeles, de cada variante. `full` se limita a [maxFullSide]. */
  val thumbSide: Int = 320,
  val mediumSide: Int = 1280,
  val maxFullSide: Int = 4096,
  /** Calidad de la re-codificación JPEG, de 0 (exclusivo) a 1. */
  val jpegQuality: Float = 0.85f,
  /** Edad mínima de un archivo sin fila para que el barrido lo retire. */
  val orphanMinAge: Duration = Duration.ofDays(1),
) {
  init {
    require(maxFileBytes > 0) { "El tamaño máximo de un archivo debe ser positivo" }
    require(maxFiles > 0) { "El número de archivos por subida debe ser positivo" }
    require(maxPerOwner > 0) { "El máximo de fotografías por dueño debe ser positivo" }
    require(maxPixels > 0) { "El máximo de píxeles debe ser positivo" }
    require(thumbSide > 0) { "El lado de la miniatura debe ser positivo" }
    require(thumbSide <= mediumSide) { "La miniatura ($thumbSide px) no puede ser mayor que la variante media ($mediumSide px)" }
    require(mediumSide <= maxFullSide) { "La variante media ($mediumSide px) no puede ser mayor que el máximo de la completa ($maxFullSide px)" }
    require(jpegQuality > 0f && jpegQuality <= 1f) { "La calidad JPEG debe estar entre 0 (exclusivo) y 1" }
    require(!orphanMinAge.isNegative) { "La edad mínima de un huérfano no puede ser negativa" }
  }
}

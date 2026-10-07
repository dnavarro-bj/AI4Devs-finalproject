package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

/**
 * Las rutas **relativas** de las tres variantes de una fotografía (`/media/<id>/thumb`…). El cliente
 * las completa con la base del API que ya conoce (ADR-013): así el servidor no necesita saber su URL pública.
 */
data class PhotoUrlsResponse(val thumb: String, val medium: String, val full: String) {
  companion object {
    fun of(id: String) = PhotoUrlsResponse("/media/$id/thumb", "/media/$id/medium", "/media/$id/full")
  }
}

/** Una fotografía de la galería de referencia de una especie. */
data class SpeciesPhotoResponse(
  val id: String,
  val altText: String,
  val width: Int,
  val height: Int,
  val contentType: String,
  /** Cuándo se tomó, si se sabe (EXIF o corregida a mano). */
  val capturedAt: Instant?,
  /** Cuándo se subió. */
  val createdAt: Instant,
  val urls: PhotoUrlsResponse,
  val position: Int,
  val primary: Boolean,
  val credit: String?,
)

/** Una fotografía de la galería de un ejemplar. */
data class PlantPhotoResponse(
  val id: String,
  val altText: String,
  val width: Int,
  val height: Int,
  val contentType: String,
  val capturedAt: Instant?,
  val createdAt: Instant,
  val urls: PhotoUrlsResponse,
  val position: Int,
  val primary: Boolean,
  /** `general`, `detalle` o `etiqueta_fisica`; ausente si no se indicó. */
  val purpose: String?,
  /** El evento de la cronología del que cuelga, si cuelga de alguno. */
  val eventId: String?,
)

/** La portada de una especie o de un ejemplar: lo justo para pintarla en una fila o una cabecera. */
data class PrimaryPhotoResponse(val id: String, val altText: String, val urls: PhotoUrlsResponse)

/** Una fotografía vista desde la tarjeta de un evento de la cronología. */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class TimelinePhotoResponse(
  val id: String,
  val altText: String,
  val width: Int,
  val height: Int,
  val capturedAt: Instant?,
  val urls: PhotoUrlsResponse,
)

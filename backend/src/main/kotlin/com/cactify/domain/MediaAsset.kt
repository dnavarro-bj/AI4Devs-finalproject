package com.cactify.domain

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * El archivo de una fotografía: **lo que es**, no de quién es ni cómo se muestra (eso lo dicen
 * [SpeciesMedia] y [PlantMedia]). Guarda la referencia al almacén —nunca el binario—, el tipo y las
 * dimensiones de lo que se re-codificó, el texto alternativo obligatorio y la fecha de captura.
 *
 * Se construye con [create], que valida antes de asignar (ADR-011) y juzga la fecha de captura contra
 * el reloj único. La carpeta del almacén se deriva del identificador: ningún nombre viene del usuario.
 */
@Entity
@Table(name = "media_asset")
@BatchSize(size = 50)
class MediaAsset private constructor(
  @EmbeddedId
  override val id: MediaAssetId,
  contentType: String,
  width: Int,
  height: Int,
  sizeBytes: Long,
  altText: String,
  capturedAt: Instant?,
) : AbstractEntity<MediaAssetId>() {

  /** La carpeta del almacén (`media/<id>`) que contiene las tres variantes. */
  @Column(name = "storage_key", nullable = false, updatable = false)
  val storageKey: String = storageKeyOf(id)

  @Column(name = "content_type", nullable = false, updatable = false)
  var contentType: String = contentType
    private set

  @Column(name = "width", nullable = false, updatable = false)
  var width: Int = width
    private set

  @Column(name = "height", nullable = false, updatable = false)
  var height: Int = height
    private set

  @Column(name = "size_bytes", nullable = false, updatable = false)
  var sizeBytes: Long = sizeBytes
    private set

  @Column(name = "alt_text", nullable = false)
  var altText: String = altText
    private set

  @Column(name = "captured_at")
  var capturedAt: Instant? = capturedAt
    private set

  fun correctAltText(value: String) {
    altText = cleanAlt(value)
  }

  /** `null` borra la fecha: la foto vuelve a ordenarse por su fecha de subida. */
  fun correctCapturedAt(value: Instant?, clock: Clock, maxFutureSkew: Duration) {
    capturedAt = stamp(value, clock, maxFutureSkew)
  }

  companion object {
    val CONTENT_TYPES = setOf("image/jpeg", "image/png")

    fun storageKeyOf(id: MediaAssetId): String = "media/$id"

    fun create(
      contentType: String,
      width: Int,
      height: Int,
      sizeBytes: Long,
      altText: String,
      capturedAt: Instant?,
      clock: Clock,
      maxFutureSkew: Duration,
      id: MediaAssetId = MediaAssetId.create(),
    ): MediaAsset {
      require(contentType in CONTENT_TYPES) { "El tipo '$contentType' no se guarda: ${CONTENT_TYPES.joinToString()}" }
      require(width > 0 && height > 0) { "Las dimensiones de la imagen deben ser positivas" }
      require(sizeBytes > 0) { "El tamaño de la imagen debe ser positivo" }
      return MediaAsset(
        id = id,
        contentType = contentType,
        width = width,
        height = height,
        sizeBytes = sizeBytes,
        altText = cleanAlt(altText),
        capturedAt = stamp(capturedAt, clock, maxFutureSkew),
      )
    }

    private fun cleanAlt(value: String): String {
      val cleaned = value.trim()
      require(cleaned.isNotEmpty()) { "El texto alternativo no puede estar en blanco" }
      return cleaned
    }

    private fun stamp(value: Instant?, clock: Clock, maxFutureSkew: Duration): Instant? {
      val stamped = value?.truncatedTo(ChronoUnit.MICROS) ?: return null
      require(!stamped.isAfter(clock.instant().plus(maxFutureSkew))) { "La fecha de captura no puede estar en el futuro" }
      return stamped
    }
  }
}

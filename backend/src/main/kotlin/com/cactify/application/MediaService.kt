package com.cactify.application

import com.cactify.application.ports.MediaStorage
import com.cactify.domain.ImageVariant
import com.cactify.domain.MediaAsset
import com.cactify.domain.MediaAssetId
import com.cactify.domain.repos.MediaAssetRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.transaction.support.TransactionTemplate
import java.io.InputStream
import java.time.Clock
import java.time.Duration
import java.time.Instant

/**
 * Un archivo recibido. **No lleva nombre**: lo que el cliente llame a su archivo no entra nunca al
 * sistema (ADR-018) —ni en la clave del almacén ni en las respuestas—.
 */
class UploadedFile(val bytes: ByteArray)

/** Una variante lista para servir: tipo fijado por el servidor, tamaño, flujo y el `ETag` de su contenido. */
class MediaFile(val contentType: String, val size: Long, val content: InputStream, val etag: String)

/**
 * Lo que es común a las fotografías de una especie y las de un ejemplar: validar y procesar la subida,
 * escribirla en el almacén y retirar lo que sobra. Los servicios de cada dueño ponen las reglas del
 * dueño (galería, portada, evento) en la función que se les pasa a [upload].
 *
 * **Orden de una subida** (ADR-018, decisión 8): (1) comprobar número y tamaño, (2) procesar **todo**
 * en memoria —el primer archivo inválido corta, con nada escrito—, (3) escribir los archivos, (4)
 * guardar las filas en una transacción y (5) si ese paso falla, retirar lo escrito. **Orden de un
 * borrado**: la fila primero, los archivos después y solo cuando la transacción se confirma.
 */
@Service
class MediaService(
  private val storage: MediaStorage,
  private val assetRepository: MediaAssetRepository,
  private val processor: ImageProcessor,
  private val limits: MediaLimits,
  private val clock: Clock,
  transactionManager: PlatformTransactionManager,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) {

  private val transaction = TransactionTemplate(transactionManager)

  /**
   * Procesa y guarda [files] y devuelve lo que [persist] devuelve. [persist] corre **dentro de la
   * transacción** que guarda los archivos (assets) y recibe uno por archivo, en el orden recibido:
   * ahí cada dueño crea sus filas satélite y mapea la respuesta. [altText] y [capturedAt] valen para
   * toda la subida; la fecha explícita manda sobre la del EXIF.
   */
  fun <R> upload(files: List<UploadedFile>, altText: String, capturedAt: Instant?, persist: (List<MediaAsset>) -> R): R {
    if (files.isEmpty()) throw InvalidMediaException("La subida no trae ningún archivo")
    if (files.size > limits.maxFiles) throw InvalidMediaException("Una subida admite como mucho ${limits.maxFiles} archivos y trae ${files.size}")
    files.forEachIndexed { index, file ->
      if (file.bytes.size > limits.maxFileBytes) {
        throw MediaTooLargeException("El archivo ${index + 1} pesa más del máximo de ${limits.maxFileBytes / (1024 * 1024)} MB")
      }
    }

    val now = clock.instant()
    val assets = files.mapIndexed { index, file ->
      val processed = try {
        processor.process(file.bytes)
      } catch (e: InvalidImageException) {
        throw InvalidMediaException("El archivo ${index + 1}: ${e.message}")
      }
      // Una fecha del EXIF en el futuro es un reloj mal puesto en la cámara: se ignora, no se rechaza la foto.
      val exifDate = processed.capturedAt?.takeUnless { it.isAfter(now.plus(maxFutureSkew)) }
      val asset = MediaAsset.create(
        contentType = processed.contentType,
        width = processed.width,
        height = processed.height,
        sizeBytes = processed.variants.getValue(ImageVariant.Full).size.toLong(),
        altText = altText,
        capturedAt = capturedAt ?: exifDate,
        clock = clock,
        maxFutureSkew = maxFutureSkew,
      )
      asset to processed
    }

    val written = mutableListOf<String>()
    try {
      assets.forEach { (asset, processed) ->
        written += asset.storageKey
        processed.variants.forEach { (variant, bytes) -> storage.save(ImageVariant.keyOf(asset.storageKey, variant), bytes) }
      }
      return transaction.execute {
        val saved = assets.map { (asset, _) -> assetRepository.save(asset) }
        assetRepository.flush()
        persist(saved)
      } as R
    } catch (e: Throwable) {
      written.forEach { removeFolder(it) }
      throw e
    }
  }

  /**
   * Borra la fila de una fotografía y retira sus archivos **cuando la transacción se confirma**: si se
   * deshace, no se retira nada. Un fallo al retirar un archivo se registra y no se propaga: el cliente
   * ya tiene su respuesta, la fila no vuelve y el barrido recoge el huérfano.
   */
  @Transactional
  fun delete(asset: MediaAsset) {
    val folder = asset.storageKey
    assetRepository.delete(asset)
    afterCommit { removeFolder(folder) }
  }

  /** Una variante para servirla. Un identificador o una variante que no existen son un `404`. */
  @Transactional(readOnly = true)
  fun open(id: String, variant: String): MediaFile {
    val wanted = ImageVariant.find(variant) ?: throw MediaNotFoundException(id)
    val assetId = try {
      MediaAssetId.from(id)
    } catch (_: NumberFormatException) {
      throw MediaNotFoundException(id)
    }
    val asset = assetRepository.findOneById(assetId) ?: throw MediaNotFoundException(id)
    val stored = storage.open(ImageVariant.keyOf(asset.storageKey, wanted)) ?: throw MediaNotFoundException(id)
    return MediaFile(asset.contentType, stored.size, stored.content, "\"${asset.id}-${wanted.value}\"")
  }

  private fun afterCommit(action: () -> Unit) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
        override fun afterCommit() = action()
      })
    } else {
      action()
    }
  }

  private fun removeFolder(folder: String) {
    try {
      storage.deleteFolder(folder)
    } catch (e: Exception) {
      log.warn("No se pudo retirar la carpeta {} del almacén; la recogerá el barrido: {}", folder, e.message)
    }
  }

  private companion object {
    val log = LoggerFactory.getLogger(MediaService::class.java)
  }
}

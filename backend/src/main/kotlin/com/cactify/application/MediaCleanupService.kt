package com.cactify.application

import com.cactify.application.ports.MediaStorage
import com.cactify.domain.MediaAssetId
import com.cactify.domain.repos.MediaAssetRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.time.Clock

/**
 * El barrido de mantenimiento de las fotografías (ADR-018, decisión 4). Retira las carpetas del almacén
 * **que ninguna fila referencia** y tienen más de [MediaLimits.orphanMinAge] —de modo que una subida en
 * curso, cuyos archivos existen un instante antes que su fila, no se confunda con un huérfano— y
 * **informa** de las filas a las que les falta algún archivo, sin tocarlas: arreglarlas solas sería
 * decidir por el usuario qué fotografías «no existieron».
 *
 * Es un servicio de aplicación y se prueba con el reloj inyectado; lo planifica
 * `MediaCleanupScheduler`. No toca nada que no sea una carpeta de identificador bajo `media/`.
 */
@Service
class MediaCleanupService(
  private val storage: MediaStorage,
  private val assetRepository: MediaAssetRepository,
  private val limits: MediaLimits,
  private val clock: Clock,
) {

  /** Qué carpetas se retiraron y de qué fotografías falta algún archivo. */
  data class Result(val removed: List<String>, val missingFiles: List<String>)

  fun sweep(): Result = Result(removeOrphans(), findMissingFiles())

  private fun removeOrphans(): List<String> {
    val cutoff = clock.instant().minus(limits.orphanMinAge)
    // Solo las carpetas que son un identificador: lo demás no es nuestro.
    val ours = storage.listFolders(ROOT).mapNotNull { folder ->
      folder.key.substringAfterLast('/').toLongOrNull()?.let { MediaAssetId.from(it) to folder }
    }
    val referenced = ours.map { it.first }.chunked(CHUNK)
      .flatMap { assetRepository.findAllByIdIn(it) }
      .map { it.id }.toSet()
    val removed = mutableListOf<String>()
    ours.filter { (id, folder) -> id !in referenced && folder.modifiedAt.isBefore(cutoff) }.forEach { (_, folder) ->
      try {
        storage.deleteFolder(folder.key)
        removed += folder.key
        log.info("Barrido de fotografías: retirado el huérfano {}", folder.key)
      } catch (e: Exception) {
        log.warn("No se pudo retirar el huérfano {}: {}", folder.key, e.message)
      }
    }
    return removed
  }

  private fun findMissingFiles(): List<String> {
    val missing = mutableListOf<String>()
    var page = 0
    while (true) {
      val assets = assetRepository.findAll(PageRequest.of(page, CHUNK))
      assets.content
        .filter { asset -> VARIANTS.any { !storage.exists("${asset.storageKey}/$it") } }
        .forEach {
          missing += it.id.toString()
          log.warn("La fotografía {} tiene fila pero le falta algún archivo en el almacén", it.id)
        }
      if (!assets.hasNext()) break
      page++
    }
    return missing
  }

  private companion object {
    val log = LoggerFactory.getLogger(MediaCleanupService::class.java)
    const val ROOT = "media"
    const val CHUNK = 500
    val VARIANTS = listOf("thumb", "medium", "full")
  }
}

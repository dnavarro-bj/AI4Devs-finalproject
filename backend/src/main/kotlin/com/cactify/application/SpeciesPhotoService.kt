package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SpeciesPhotoResponse
import com.cactify.domain.MediaAssetId
import com.cactify.domain.MediaGallery
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.SpeciesMedia
import com.cactify.domain.repos.SpeciesMediaRepository
import com.cactify.domain.repos.SpeciesRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant

/**
 * La galería de referencia de una especie: subir, listar, corregir, elegir portada, reordenar y borrar.
 * Las reglas de conjunto —primera principal, una sola, promoción al borrar— son de [MediaGallery];
 * el procesado y el almacén, de [MediaService].
 */
@Service
class SpeciesPhotoService(
  private val speciesRepository: SpeciesRepository,
  private val mediaRepository: SpeciesMediaRepository,
  private val mediaService: MediaService,
  private val limits: MediaLimits,
  private val clock: Clock,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) {

  data class UploadCommand(val altText: String?, val capturedAt: Instant?, val credit: String?)

  /**
   * El `404` de la especie y el `409` de la galería llena se resuelven **antes** de procesar nada: una
   * subida que no cabe no gasta CPU ni escribe archivos. Lo que se guarda se vuelve a comprobar dentro
   * de la transacción, que es la que manda.
   */
  fun upload(speciesId: String, files: List<UploadedFile>, command: UploadCommand): List<SpeciesPhotoResponse> {
    val species = requireSpecies(speciesId)
    MediaGallery.requireRoom(mediaRepository.countBySpeciesId(species.id).toInt(), files.size, limits.maxPerOwner)
    val altText = command.altText?.takeIf { it.isNotBlank() } ?: "Fotografía de ${species.scientificName}"
    return mediaService.upload(files, altText, command.capturedAt) { assets ->
      val owner = requireSpecies(speciesId)
      val gallery = gallery(owner.id)
      gallery.requireRoomFor(assets.size)
      assets.map { asset ->
        SpeciesMedia(asset, owner, command.credit).also {
          gallery.add(it)
          mediaRepository.save(it)
        }
      }.also { mediaRepository.flush() }.map { it.toResponse() }
    }
  }

  @Transactional(readOnly = true)
  fun list(speciesId: String, pageable: Pageable): PageResponse<SpeciesPhotoResponse> {
    val species = requireSpecies(speciesId)
    // La galería de una especie es siempre manual: el orden no se pide.
    val page = PageRequest.of(pageable.pageNumber, pageable.pageSize, Sort.by(Sort.Order.asc("position"), Sort.Order.asc("id.id")))
    return PageResponse.of(mediaRepository.findBySpeciesId(species.id, page)) { it.toResponse() }
  }

  @Transactional
  fun update(speciesId: String, mediaId: String, patch: PhotoPatch): SpeciesPhotoResponse {
    val entry = requireEntry(speciesId, mediaId)
    if (patch.has("altText")) entry.asset.correctAltText(requireNotNull(patch.altText) { "El texto alternativo no puede estar en blanco" })
    if (patch.has("credit")) entry.correctCredit(patch.credit)
    if (patch.has("capturedAt")) entry.asset.correctCapturedAt(patch.capturedAt, clock, maxFutureSkew)
    if (patch.has("primary")) {
      gallery(entry.species.id).setPrimary(entry.mediaId, requireNotNull(patch.primary) { "primary debe ser verdadero o falso" }) {
        mediaRepository.flush()
      }
    }
    return entry.toResponse()
  }

  /** Recibe **todos** los identificadores en su nuevo orden; falta o sobra alguno, `400`. */
  @Transactional
  fun reorder(speciesId: String, ids: List<String>): List<SpeciesPhotoResponse> {
    val species = requireSpecies(speciesId)
    val gallery = gallery(species.id)
    gallery.reorder(ids.map { MediaAssetId.from(it) })
    return gallery.entries.map { it.toResponse() }
  }

  /** Borra la fila y, tras confirmarse, los archivos. Si era la portada, lo es la siguiente por orden. */
  @Transactional
  fun delete(speciesId: String, mediaId: String) {
    val entry = requireEntry(speciesId, mediaId)
    gallery(entry.species.id).remove(entry.mediaId) {
      mediaRepository.delete(entry)
      mediaService.delete(entry.asset)
      mediaRepository.flush()
    }
  }

  private fun gallery(speciesId: SpeciesId) =
    MediaGallery(mediaRepository.findAllBySpeciesIdOrderByPositionAsc(speciesId), limits.maxPerOwner)

  private fun requireSpecies(id: String): Species =
    speciesRepository.findOneById(SpeciesId.from(id)) ?: throw SpeciesNotFoundException(id)

  /** La fotografía de **esa** especie: la de otra es un `404`, no hay acceso cruzado. */
  private fun requireEntry(speciesId: String, mediaId: String): SpeciesMedia {
    val species = requireSpecies(speciesId)
    val entry = try {
      mediaRepository.findOneById(MediaAssetId.from(mediaId))
    } catch (_: NumberFormatException) {
      null
    }
    return entry?.takeIf { it.species.id == species.id } ?: throw MediaNotFoundException(mediaId)
  }
}

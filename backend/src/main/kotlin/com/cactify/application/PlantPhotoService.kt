package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.PlantPhotoResponse
import com.cactify.domain.MediaAssetId
import com.cactify.domain.MediaGallery
import com.cactify.domain.MediaPurpose
import com.cactify.domain.Plant
import com.cactify.domain.PlantEvent
import com.cactify.domain.PlantEventId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMedia
import com.cactify.domain.repos.PlantEventRepository
import com.cactify.domain.repos.PlantMediaRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.specs.PlantMediaSpecs
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant

/**
 * La galería de un ejemplar: su evolución, con las fotografías que cuelgan de un evento de la
 * cronología. Sube en cualquier momento —también a un ejemplar archivado— y un ejemplar sin
 * fotografías es plenamente válido.
 */
@Service
class PlantPhotoService(
  private val plantRepository: PlantRepository,
  private val eventRepository: PlantEventRepository,
  private val mediaRepository: PlantMediaRepository,
  private val mediaService: MediaService,
  private val limits: MediaLimits,
  private val clock: Clock,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) {

  data class UploadCommand(val altText: String?, val capturedAt: Instant?, val purpose: String?, val eventId: String?)

  /**
   * Lo que depende de los datos del cuerpo —el propósito, el evento, la galería llena— se comprueba
   * **antes** de procesar nada: una subida que se va a rechazar no gasta CPU ni escribe archivos.
   */
  fun upload(plantId: String, files: List<UploadedFile>, command: UploadCommand): List<PlantPhotoResponse> {
    val plant = requirePlant(plantId)
    val purpose = command.purpose?.takeIf { it.isNotBlank() }?.let { MediaPurpose(it) }
    command.eventId?.takeIf { it.isNotBlank() }?.let { requireEvent(plant, it) }
    MediaGallery.requireRoom(mediaRepository.countByPlantId(plant.id).toInt(), files.size, limits.maxPerOwner)
    val altText = command.altText?.takeIf { it.isNotBlank() } ?: "Fotografía de ${plant.nickname} (${plant.code})"
    return mediaService.upload(files, altText, command.capturedAt) { assets ->
      val owner = requirePlant(plantId)
      val event = command.eventId?.takeIf { it.isNotBlank() }?.let { requireEvent(owner, it) }
      val gallery = gallery(owner.id)
      gallery.requireRoomFor(assets.size)
      assets.map { asset ->
        PlantMedia(asset, owner, purpose, event).also {
          gallery.add(it)
          mediaRepository.save(it)
        }
      }.also { mediaRepository.flush() }.map { it.toResponse() }
    }
  }

  /**
   * Por defecto, **la evolución**: de la captura más reciente a la más antigua. `?sort=position` da el
   * orden manual; cualquier otra clave es un `400`.
   */
  @Transactional(readOnly = true)
  fun list(plantId: String, purpose: String?, eventId: String?, pageable: Pageable): PageResponse<PlantPhotoResponse> {
    val plant = requirePlant(plantId)
    var spec: Specification<PlantMedia> = PlantMediaSpecs.ofPlant(plant.id)
      .and(PlantMediaSpecs.byPurpose(purpose?.takeIf { it.isNotBlank() }?.let { MediaPurpose(it) }))
      .and(PlantMediaSpecs.byEvent(eventId?.takeIf { it.isNotBlank() }?.let { PlantEventId.from(it) }))
    val paging = if (pageable.sort.isSorted) {
      val direction = pageable.sort.map { order ->
        require(order.property == "position") { "No se puede ordenar por '${order.property}': la clave admitida es position" }
        order.direction
      }.first()
      PageRequest.of(pageable.pageNumber, pageable.pageSize, Sort.by(Sort.Order(direction, "position"), Sort.Order.asc("id.id")))
    } else {
      spec = spec.and(PlantMediaSpecs.inEvolutionOrder())
      PageRequest.of(pageable.pageNumber, pageable.pageSize)
    }
    return PageResponse.of(mediaRepository.findAll(spec, paging)) { it.toResponse() }
  }

  @Transactional
  fun update(plantId: String, mediaId: String, patch: PhotoPatch): PlantPhotoResponse {
    val entry = requireEntry(plantId, mediaId)
    if (patch.has("altText")) entry.asset.correctAltText(requireNotNull(patch.altText) { "El texto alternativo no puede estar en blanco" })
    if (patch.has("capturedAt")) entry.asset.correctCapturedAt(patch.capturedAt, clock, maxFutureSkew)
    if (patch.has("purpose")) entry.correctPurpose(patch.purpose?.let { MediaPurpose(it) })
    if (patch.has("eventId")) entry.attachTo(patch.eventId?.let { requireEvent(entry.plant, it) })
    if (patch.has("primary")) {
      gallery(entry.plant.id).setPrimary(entry.mediaId, requireNotNull(patch.primary) { "primary debe ser verdadero o falso" }) {
        mediaRepository.flush()
      }
    }
    return entry.toResponse()
  }

  @Transactional
  fun reorder(plantId: String, ids: List<String>): List<PlantPhotoResponse> {
    val plant = requirePlant(plantId)
    val gallery = gallery(plant.id)
    gallery.reorder(ids.map { MediaAssetId.from(it) })
    return gallery.entries.map { it.toResponse() }
  }

  /** Borra la fila y, tras confirmarse, los archivos. Si era la principal, lo es la siguiente por orden manual. */
  @Transactional
  fun delete(plantId: String, mediaId: String) {
    val entry = requireEntry(plantId, mediaId)
    gallery(entry.plant.id).remove(entry.mediaId) {
      mediaRepository.delete(entry)
      mediaService.delete(entry.asset)
      mediaRepository.flush()
    }
  }

  private fun gallery(plantId: PlantId) =
    MediaGallery(mediaRepository.findAllByPlantIdOrderByPositionAsc(plantId), limits.maxPerOwner)

  private fun requirePlant(id: String): Plant =
    plantRepository.findOneById(PlantId.from(id)) ?: throw PlantNotFoundException(id)

  /**
   * Un evento **del cuerpo** que no existe, o que es de otro ejemplar, es un `400`: no es el recurso de
   * la URL. Las lecturas, los cambios de estado y los movimientos no son eventos de la espina y por lo
   * mismo no existen aquí.
   */
  private fun requireEvent(plant: Plant, eventId: String): PlantEvent =
    eventRepository.findOneById(PlantEventId.from(eventId))?.takeIf { it.plant.id == plant.id }
      ?: throw InvalidReferenceException("El evento", eventId)

  private fun requireEntry(plantId: String, mediaId: String): PlantMedia {
    val plant = requirePlant(plantId)
    val entry = try {
      mediaRepository.findOneById(MediaAssetId.from(mediaId))
    } catch (_: NumberFormatException) {
      null
    }
    return entry?.takeIf { it.plant.id == plant.id } ?: throw MediaNotFoundException(mediaId)
  }
}

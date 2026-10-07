package com.cactify.application

import com.cactify.application.dto.TimelineEntryResponse
import com.cactify.domain.BloomStatus
import com.cactify.domain.InterventionType
import com.cactify.domain.Plant
import com.cactify.domain.PlantBloom
import com.cactify.domain.PlantComment
import com.cactify.domain.PlantEvent
import com.cactify.domain.PlantEventId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantIntervention
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.repos.PlantEventRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate

/**
 * Comentarios, intervenciones y floraciones observadas: registrar, corregir y retirar. Cada
 * operación devuelve la entrada de la cronología ya montada. Un evento ajeno a la planta de la URL,
 * o de otro tipo que el del recurso, es `404`: no hay acceso cruzado. No bloquea ningún estado de
 * la planta: se puede anotar sobre un ejemplar archivado.
 */
@Service
class PlantEventService(
  private val plantRepository: PlantRepository,
  private val eventRepository: PlantEventRepository,
  private val soilMixRepository: SoilMixRepository,
  private val clock: Clock,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) {

  data class CommentCommand(val text: String, val occurredAt: Instant?)

  data class InterventionCommand(
    val type: String,
    val occurredAt: Instant?,
    val product: String?,
    val potSize: String?,
    val soilMixId: String?,
    val notes: String?,
  )

  data class BloomCommand(
    val startedOn: LocalDate,
    val endedOn: LocalDate?,
    val status: String,
    val flowerCount: Int?,
    val notes: String?,
  )

  // ---- Comentarios ----

  @Transactional
  fun addComment(plantId: String, command: CommentCommand): TimelineEntryResponse {
    val plant = requirePlant(plantId)
    return eventRepository.save(PlantComment.record(plant, command.text, command.occurredAt, clock, maxFutureSkew)).toEntry()
  }

  @Transactional
  fun editComment(plantId: String, commentId: String, text: String): TimelineEntryResponse {
    val comment = requireEvent<PlantComment>(plantId, commentId, "El comentario")
    comment.edit(text, clock)
    return comment.toEntry()
  }

  @Transactional
  fun removeComment(plantId: String, commentId: String) =
    eventRepository.delete(requireEvent<PlantComment>(plantId, commentId, "El comentario"))

  // ---- Intervenciones ----

  @Transactional
  fun addIntervention(plantId: String, command: InterventionCommand): TimelineEntryResponse {
    val plant = requirePlant(plantId)
    val intervention = PlantIntervention.record(
      plant, InterventionType(command.type), command.product, command.potSize, resolveMix(command.soilMixId),
      command.notes, command.occurredAt, clock, maxFutureSkew,
    )
    return eventRepository.save(intervention).toEntry()
  }

  @Transactional
  fun replaceIntervention(plantId: String, interventionId: String, command: InterventionCommand): TimelineEntryResponse {
    val intervention = requireEvent<PlantIntervention>(plantId, interventionId, "La intervención")
    intervention.replace(
      InterventionType(command.type), command.product, command.potSize, resolveMix(command.soilMixId),
      command.notes, command.occurredAt, clock, maxFutureSkew,
    )
    return intervention.toEntry()
  }

  @Transactional
  fun removeIntervention(plantId: String, interventionId: String) =
    eventRepository.delete(requireEvent<PlantIntervention>(plantId, interventionId, "La intervención"))

  // ---- Floraciones ----

  @Transactional
  fun addBloom(plantId: String, command: BloomCommand): TimelineEntryResponse {
    val plant = requirePlant(plantId)
    val bloom = PlantBloom.record(
      plant, command.startedOn, command.endedOn, BloomStatus(command.status), command.flowerCount, command.notes, clock,
    )
    return eventRepository.save(bloom).toEntry()
  }

  @Transactional
  fun replaceBloom(plantId: String, bloomId: String, command: BloomCommand): TimelineEntryResponse {
    val bloom = requireEvent<PlantBloom>(plantId, bloomId, "La floración")
    bloom.replace(command.startedOn, command.endedOn, BloomStatus(command.status), command.flowerCount, command.notes, clock)
    return bloom.toEntry()
  }

  @Transactional
  fun removeBloom(plantId: String, bloomId: String) =
    eventRepository.delete(requireEvent<PlantBloom>(plantId, bloomId, "La floración"))

  // ---- Soporte ----

  private fun requirePlant(plantId: String): Plant =
    plantRepository.findOneById(PlantId.from(plantId)) ?: throw PlantNotFoundException(plantId)

  /** Una mezcla del cuerpo que no existe es `400`, no `404`: no es el recurso de la URL. */
  private fun resolveMix(soilMixId: String?): SoilMix? = soilMixId?.let {
    soilMixRepository.findOneById(SoilMixId.from(it)) ?: throw InvalidReferenceException("La mezcla de tierra", it)
  }

  private inline fun <reified E : PlantEvent> requireEvent(plantId: String, eventId: String, kind: String): E {
    val plant = requirePlant(plantId)
    val event = eventRepository.findOneById(PlantEventId.from(eventId))
    return (event as? E)?.takeIf { it.plant.id == plant.id } ?: throw PlantEventNotFoundException(kind, eventId)
  }
}

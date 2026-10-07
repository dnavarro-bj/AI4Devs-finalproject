package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TimelineEntryResponse
import com.cactify.domain.CareRecordId
import com.cactify.domain.PlantEventId
import com.cactify.domain.PlantId
import com.cactify.domain.PlantMovementId
import com.cactify.domain.PlantStatusChangeId
import com.cactify.domain.TimelineType
import com.cactify.domain.repos.AIRecommendationRepository
import com.cactify.domain.repos.CareRecordRepository
import com.cactify.domain.repos.PlantEventRepository
import com.cactify.domain.repos.PlantMovementRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.PlantStatusChangeRepository
import com.cactify.domain.repos.PlantTimelineRepository
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * La historia del ejemplar como una sola lista. El puerto da **la página de referencias** —ya
 * filtrada y ordenada—; aquí se agrupan por tipo y se carga cada grupo con **una consulta por tipo**
 * (no una por fila), todo dentro de la transacción, y se devuelven en el orden de la página.
 */
@Service
class PlantTimelineService(
  private val plantRepository: PlantRepository,
  private val timelineRepository: PlantTimelineRepository,
  private val careRecordRepository: CareRecordRepository,
  private val aiRecommendationRepository: AIRecommendationRepository,
  private val statusChangeRepository: PlantStatusChangeRepository,
  private val movementRepository: PlantMovementRepository,
  private val eventRepository: PlantEventRepository,
) {

  @Transactional(readOnly = true)
  fun timeline(plantId: String, types: Set<TimelineType>, pageable: Pageable): PageResponse<TimelineEntryResponse> {
    val plant = plantRepository.findOneById(PlantId.from(plantId)) ?: throw PlantNotFoundException(plantId)
    val page = timelineRepository.findPage(plant.id, types, pageable)
    val byType = page.content.groupBy({ it.type }, { it.id })

    val entries = mutableMapOf<Pair<TimelineType, Long>, TimelineEntryResponse>()

    byType[TimelineType.Reading]?.let { ids ->
      val records = careRecordRepository.findAllByIdIn(ids.map { CareRecordId.from(it) })
      val recommendations = aiRecommendationRepository.findAllByCareRecordIdIn(records.map { it.id }).associateBy { it.careRecord.id }
      records.forEach { entries[TimelineType.Reading to it.id.id] = it.toEntry(recommendations[it.id]) }
    }
    byType[TimelineType.StatusChange]?.let { ids ->
      statusChangeRepository.findAllByIdIn(ids.map { PlantStatusChangeId.from(it) })
        .forEach { entries[TimelineType.StatusChange to it.id.id] = it.toEntry() }
    }
    byType[TimelineType.Movement]?.let { ids ->
      movementRepository.findAllByIdIn(ids.map { PlantMovementId.from(it) })
        .forEach { entries[TimelineType.Movement to it.id.id] = it.toEntry() }
    }
    val eventTypes = listOf(TimelineType.Comment, TimelineType.Intervention, TimelineType.Bloom, TimelineType.Task)
    val eventIds = eventTypes.flatMap { byType[it].orEmpty() }
    if (eventIds.isNotEmpty()) {
      eventRepository.findAllByIdIn(eventIds.map { PlantEventId.from(it) }).forEach {
        val entry = it.toEntry()
        entries[TimelineType(entry.type) to it.id.id] = entry
      }
    }

    val ordered = page.content.mapNotNull { entries[it.type to it.id] }
    return PageResponse.of(PageImpl(ordered, pageable, page.totalElements)) { it }
  }
}

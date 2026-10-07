package com.cactify.application

import com.cactify.application.dto.ActivityBatchResponse
import com.cactify.application.dto.ActivityCommentResponse
import com.cactify.application.dto.ActivityEntryResponse
import com.cactify.application.dto.ActivityInterventionResponse
import com.cactify.application.dto.ActivityPlantResponse
import com.cactify.application.dto.ActivityTaskResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.repos.ActivityPlant
import com.cactify.domain.repos.ActivityRef
import com.cactify.domain.repos.ActivityRepository
import com.cactify.domain.repos.ActivityType
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Lo que se ha hecho en la colección. El puerto da la **página de referencias**; aquí se agrupan por
 * tipo y se carga cada grupo con **una consulta por tipo**, dentro de la transacción, respetando el
 * orden de la página.
 */
@Service
class ActivityService(private val activityRepository: ActivityRepository) {

  @Transactional(readOnly = true)
  fun recent(pageable: Pageable): PageResponse<ActivityEntryResponse> {
    val page = activityRepository.findPage(pageable)
    val byType = page.content.groupBy({ it.type }, { it.id })
    val entries = mutableMapOf<Pair<ActivityType, Long>, (ActivityRef) -> ActivityEntryResponse>()

    activityRepository.batches(byType[ActivityType.Batch].orEmpty()).forEach { batch ->
      entries[ActivityType.Batch to batch.id] = { ref ->
        base(ref).copy(batch = ActivityBatchResponse(batch.id.toString(), batch.action, batch.plantCount))
      }
    }
    activityRepository.tasks(byType[ActivityType.Task].orEmpty()).forEach { task ->
      entries[ActivityType.Task to task.id] = { ref ->
        base(ref).copy(task = ActivityTaskResponse(task.id.toString(), task.type, task.title, task.affectedPlants))
      }
    }
    activityRepository.comments(byType[ActivityType.Comment].orEmpty()).forEach { comment ->
      entries[ActivityType.Comment to comment.eventId] = { ref ->
        base(ref).copy(plant = comment.plant.toResponse(), comment = ActivityCommentResponse(excerpt(comment.text)))
      }
    }
    activityRepository.interventions(byType[ActivityType.Intervention].orEmpty()).forEach { intervention ->
      entries[ActivityType.Intervention to intervention.eventId] = { ref ->
        base(ref).copy(plant = intervention.plant.toResponse(), intervention = ActivityInterventionResponse(intervention.type))
      }
    }

    val ordered = page.content.mapNotNull { ref -> entries[ref.type to ref.id]?.invoke(ref) }
    return PageResponse.of(PageImpl(ordered, pageable, page.totalElements)) { it }
  }

  private fun base(ref: ActivityRef) = ActivityEntryResponse(ref.id.toString(), ref.type.value, ref.occurredAt)

  private fun ActivityPlant.toResponse() = ActivityPlantResponse(id.toString(), code, nickname)

  /** El comienzo del comentario: una línea de actividad no es el texto entero. */
  private fun excerpt(text: String): String {
    val clean = text.trim().replace(Regex("\\s+"), " ")
    return if (clean.length <= EXCERPT_MAX) clean else clean.take(EXCERPT_MAX).trimEnd() + "…"
  }

  private companion object {
    const val EXCERPT_MAX = 140
  }
}

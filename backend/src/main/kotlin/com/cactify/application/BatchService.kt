package com.cactify.application

import com.cactify.application.dto.BatchPreviewResponse
import com.cactify.application.dto.BatchResponse
import com.cactify.domain.Batch
import com.cactify.domain.BatchAction
import com.cactify.domain.BatchId
import com.cactify.domain.CareRecord
import com.cactify.domain.InterventionType
import com.cactify.domain.Plant
import com.cactify.domain.PlantComment
import com.cactify.domain.PlantId
import com.cactify.domain.PlantIntervention
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.repos.BatchRepository
import com.cactify.domain.repos.CareRecordRepository
import com.cactify.domain.repos.PlantEventRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant

/** El comentario de un lote: el mismo texto para todas las plantas incluidas. */
data class CommentInput(val text: String)

/** Cuántas plantas afectaría un alcance, sin escribir nada. */
data class BatchPreviewRequest(
  val scope: BatchScopeRequest? = null,
  val excludedPlantIds: List<String>? = null,
)

/**
 * Aplicar un lote: un alcance, unas exclusiones y **exactamente una** acción —`reading`,
 * `intervention` o `comment`—, que se aplica **igual a cada planta incluida**.
 */
data class BatchRequest(
  val scope: BatchScopeRequest? = null,
  val excludedPlantIds: List<String>? = null,
  val occurredAt: Instant? = null,
  val reading: ReadingInput? = null,
  val intervention: InterventionInput? = null,
  val comment: CommentInput? = null,
)

/**
 * Casos de uso del trabajo por lote. Una operación escribe **un registro por planta incluida** y una
 * fila `batch` con el número **real** de plantas, todo en **una sola transacción**: o quedan todos o
 * no queda ninguno. Las reglas de cada registro son las de su alta individual —se reutilizan sus
 * factorías—, y se prueban con la primera planta **antes** de escribir nada, de modo que un registro
 * inválido responde `400` sin dejar un solo evento.
 */
@Service
class BatchService(
  private val resolver: BatchScopeResolver,
  private val batchRepository: BatchRepository,
  private val plantRepository: PlantRepository,
  private val eventRepository: PlantEventRepository,
  private val careRecordRepository: CareRecordRepository,
  private val soilMixRepository: SoilMixRepository,
  private val alertDetection: AlertDetectionService,
  private val clock: Clock,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) {

  /** El número exacto de plantas al que un lote con este alcance escribiría. No escribe nada. */
  @Transactional(readOnly = true)
  fun preview(request: BatchPreviewRequest): BatchPreviewResponse {
    val resolved = resolver.resolve(request.scope)
    return BatchPreviewResponse(included(resolved, request.excludedPlantIds).size)
  }

  @Transactional
  fun apply(request: BatchRequest): BatchResponse {
    val action = actionOf(request)
    val resolved = resolver.resolve(request.scope)
    val included = included(resolved, request.excludedPlantIds)
    require(included.isNotEmpty()) { "El lote no afectaría a ninguna planta: no hay nada que registrar" }
    // El lote valida su instante y su número; los registros usan el mismo instante.
    val batch = Batch.record(action, resolved.kind, included.size, request.occurredAt, clock, maxFutureSkew)
    val mix = request.intervention?.soilMixId?.let { resolveMix(it) }

    // El mismo registro va a todas las plantas: si es válido para la primera, lo es para todas. Se
    // prueba antes de escribir nada, de modo que un registro inválido no deja ni un evento.
    plantRepository.findAllWithLocationByIdIn(listOf(included.first())).first().let { sample ->
      build(request, sample, mix, batch.occurredAt, null)
    }

    val saved = batchRepository.save(batch)
    included.chunked(CHUNK).forEach { chunk ->
      plantRepository.findAllWithLocationByIdIn(chunk).forEach { plant ->
        when (val record = build(request, plant, mix, saved.occurredAt, saved)) {
          // Una lectura fuera de rango abre su alerta venga de donde venga, en la misma transacción (T-23).
          is CareRecord -> alertDetection.onReading(careRecordRepository.save(record))
          is PlantComment -> eventRepository.save(record)
          is PlantIntervention -> eventRepository.save(record)
          else -> error("Registro de lote sin destino: ${record::class.simpleName}")
        }
      }
    }
    return saved.toResponse()
  }

  @Transactional(readOnly = true)
  fun findById(id: String): BatchResponse =
    (batchRepository.findOneById(BatchId.from(id)) ?: throw BatchNotFoundException(id)).toResponse()

  /** Las plantas del alcance menos las exclusiones; una exclusión que no está en el alcance es un `400`. */
  private fun included(resolved: ResolvedScope, excludedIds: List<String>?): List<PlantId> {
    val excluded = excludedIds.orEmpty().map { PlantId.from(it) }.toSet()
    val alien = excluded - resolved.plantIds.toSet()
    require(alien.isEmpty()) { "Las plantas ${alien.joinToString()} no están en el alcance del lote y no se pueden excluir" }
    return resolved.plantIds.filter { it !in excluded }
  }

  private fun actionOf(request: BatchRequest): BatchAction {
    val given = listOfNotNull(
      request.reading?.let { BatchAction.Reading },
      request.intervention?.let { BatchAction.Intervention },
      request.comment?.let { BatchAction.Comment },
    )
    require(given.size == 1) { "Un lote lleva exactamente una acción: reading, intervention o comment" }
    return given.single()
  }

  /** El registro de **una** planta, con las reglas de su alta individual. */
  private fun build(request: BatchRequest, plant: Plant, mix: SoilMix?, at: Instant, batch: Batch?): Any =
    request.reading?.let {
      CareRecord.record(
        plant = plant,
        humidity = it.humidity,
        temperature = it.temperature,
        lightHours = it.lightHours,
        waterAmountMl = it.waterAmountMl,
        soilPh = it.soilPh,
        recordedAt = at,
        clock = clock,
        maxFutureSkew = maxFutureSkew,
        batch = batch,
      )
    } ?: request.intervention?.let {
      PlantIntervention.record(
        plant, InterventionType(it.type), it.product, it.potSize, mix, it.notes, at, clock, maxFutureSkew, batch = batch,
      )
    } ?: PlantComment.record(plant, request.comment!!.text, at, clock, maxFutureSkew, batch)

  private fun resolveMix(id: String): SoilMix =
    soilMixRepository.findOneById(SoilMixId.from(id)) ?: throw InvalidReferenceException("La mezcla de tierra", id)

  private fun Batch.toResponse() = BatchResponse(
    id = id.toString(),
    action = action.value,
    scopeKind = scopeKind.value,
    plantCount = plantCount,
    occurredAt = occurredAt,
    createdAt = createdAt,
  )

  private companion object {
    /** Plantas por bloque al escribir. */
    const val CHUNK = 100
  }
}

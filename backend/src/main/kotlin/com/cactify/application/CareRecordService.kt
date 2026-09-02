package com.cactify.application

import com.cactify.application.dto.CareRecordRecommendationResponse
import com.cactify.application.dto.CareRecordResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.repos.AIRecommendationRepository
import com.cactify.domain.repos.CareRecordRepository
import com.cactify.domain.repos.PlantRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class CareRecordService(
  private val careRecordRepository: CareRecordRepository,
  private val plantRepository: PlantRepository,
  private val aiRecommendationRepository: AIRecommendationRepository,
  private val clock: Clock,
) {

  /** Los datos de una lectura nueva, ya despegados de la forma del mensaje HTTP. */
  data class NewCareRecord(
    val humidity: Int?,
    val temperature: Int?,
    val lightHours: Int?,
    val waterAmountMl: Int?,
    val soilPh: BigDecimal?,
    val recordedAt: Instant?,
  )

  @Transactional
  fun create(plantId: String, command: NewCareRecord): CareRecordResponse {
    val plant = requirePlant(plantId)
    val record = careRecordRepository.save(
      CareRecord(
        plant = plant,
        humidity = command.humidity,
        temperature = command.temperature,
        lightHours = command.lightHours,
        waterAmountMl = command.waterAmountMl,
        soilPh = command.soilPh,
        recordedAt = stamp(command.recordedAt),
      ),
    )
    // Recién creada: todavía no puede tener recomendación.
    return record.toResponse(null)
  }

  /**
   * El listado de una planta. La recomendación de cada lectura se resuelve **por página** con una
   * sola consulta, no con una asociación inversa: el lado inverso de un `@OneToOne` no puede ser
   * realmente `LAZY` sin bytecode enhancement, así que mapearlo dispararía un `SELECT` por fila.
   * Consultar el listado nunca genera una recomendación.
   */
  @Transactional(readOnly = true)
  fun list(plantId: String, pageable: Pageable): PageResponse<CareRecordResponse> {
    val plant = requirePlant(plantId)
    val page = careRecordRepository.findAllByPlantId(plant.id, pageable)
    val byRecord = aiRecommendationRepository
      .findAllByCareRecordIdIn(page.content.map { it.id })
      .associateBy { it.careRecord.id }
    return PageResponse.of(page) { it.toResponse(byRecord[it.id]) }
  }

  /**
   * La fecha la aporta el cliente o, en su defecto, la sella el reloj. En ambos casos se recorta a
   * microsegundos, la precisión que guarda `timestamptz`: sin el recorte, la fecha de la respuesta
   * no sería la que queda persistida (ADR-010).
   */
  private fun stamp(given: Instant?): Instant =
    (given ?: clock.instant()).truncatedTo(ChronoUnit.MICROS)

  private fun requirePlant(plantId: String): Plant =
    plantRepository.findOneById(PlantId.from(plantId)) ?: throw PlantNotFoundException(plantId)

  private fun CareRecord.toResponse(recommendation: AIRecommendation?) = CareRecordResponse(
    id = id.toString(),
    plantId = plant.id.toString(),
    recordedAt = recordedAt,
    humidity = humidity,
    temperature = temperature,
    lightHours = lightHours,
    waterAmountMl = waterAmountMl,
    soilPh = soilPh,
    recommendation = recommendation?.let {
      CareRecordRecommendationResponse(
        id = it.id.toString(),
        riskLevel = it.riskLevel,
        recommendationText = it.recommendationText,
      )
    },
  )
}

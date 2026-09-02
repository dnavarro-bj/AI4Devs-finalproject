package com.cactify.application

import com.cactify.application.dto.RecommendationResponse
import com.cactify.application.ports.Advice
import com.cactify.application.ports.AdviceRequest
import com.cactify.application.ports.CareAdvisor
import com.cactify.application.ports.Deviation
import com.cactify.application.ports.LastWatering
import com.cactify.application.ports.ReadingFacts
import com.cactify.application.ports.SpeciesFacts
import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.PlantId
import com.cactify.domain.Species
import com.cactify.domain.repos.AIRecommendationRepository
import com.cactify.domain.repos.CareRecordRepository
import com.cactify.domain.repos.PlantRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate

@Service
class RecommendationService(
  private val plantRepository: PlantRepository,
  private val careRecordRepository: CareRecordRepository,
  private val aiRecommendationRepository: AIRecommendationRepository,
  private val careAdvisor: CareAdvisor,
  private val transactions: TransactionTemplate,
) {

  /** Resultado del alta: si ya existía, no se ha consultado al proveedor. */
  data class Generated(val recommendation: RecommendationResponse, val alreadyExisted: Boolean)

  /**
   * Deliberadamente **no** es una única transacción. La llamada al proveedor es HTTP y puede tardar
   * segundos: tenerla dentro mantendría una conexión de base de datos retenida todo ese rato. Y la
   * carrera del `UNIQUE` no se puede resolver dentro de la transacción que la viola, porque
   * PostgreSQL la aborta: hay que releer en una nueva.
   *
   * Por eso los límites son explícitos con [TransactionTemplate] en lugar de anotaciones: cada
   * bloque abre y cierra donde debe, y entre ellos no hay ninguna abierta.
   */
  fun generate(plantId: String, careRecordId: String): Generated {
    val facts = transactions.execute {
      val record = requireCareRecord(plantId, careRecordId)
      aiRecommendationRepository.findOneByCareRecordId(record.id)
        ?.let { Existing(it.toResponse()) }
        ?: ToGenerate(record.id, adviceRequestFor(record))
    }!!
    if (facts is Existing) return Generated(facts.recommendation, alreadyExisted = true)

    val toGenerate = facts as ToGenerate
    val advice = careAdvisor.advise(toGenerate.request)

    return try {
      val saved = transactions.execute { persist(toGenerate.careRecordId, advice) }!!
      Generated(saved, alreadyExisted = false)
    } catch (violation: DataIntegrityViolationException) {
      // Otra petición ganó la carrera mientras hablábamos con el proveedor. La transacción que la
      // violó está abortada, así que la relectura ocurre en una nueva.
      Generated(findExisting(plantId, careRecordId), alreadyExisted = true)
    }
  }

  private sealed interface Facts
  private data class Existing(val recommendation: RecommendationResponse) : Facts
  private data class ToGenerate(val careRecordId: CareRecordId, val request: AdviceRequest) : Facts

  private fun persist(careRecordId: CareRecordId, advice: Advice): RecommendationResponse {
    val record = careRecordRepository.findOneById(careRecordId)!!
    return aiRecommendationRepository.save(
      AIRecommendation(
        careRecord = record,
        riskLevel = advice.riskLevel,
        recommendationText = advice.explanation,
        recommendedAction = advice.recommendedAction,
        priority = advice.priority,
      ),
    ).toResponse()
  }

  @Transactional(readOnly = true)
  fun find(plantId: String, careRecordId: String): RecommendationResponse {
    val record = requireCareRecord(plantId, careRecordId)
    return aiRecommendationRepository.findOneByCareRecordId(record.id)?.toResponse()
      ?: throw RecommendationNotFoundException(careRecordId)
  }

  /** Devuelve la recomendación existente; la usa el controller al perder la carrera del `UNIQUE`. */
  @Transactional(readOnly = true)
  fun findExisting(plantId: String, careRecordId: String): RecommendationResponse =
    find(plantId, careRecordId)

  /**
   * Los hechos que necesita el análisis, ya resueltos: los rangos salen de la ficha de la especie y
   * las desviaciones se calculan aquí. La IA interpreta esos datos; no decide cuáles son los rangos
   * (nota de la historia 0.4).
   */
  private fun adviceRequestFor(record: CareRecord): AdviceRequest {
    val species = record.plant.species
    return AdviceRequest(
      species = species.toFacts(),
      reading = ReadingFacts(
        recordedAt = record.recordedAt,
        humidity = record.humidity,
        temperature = record.temperature,
        lightHours = record.lightHours,
        waterAmountMl = record.waterAmountMl,
        soilPh = record.soilPh,
      ),
      deviations = deviationsOf(record, species),
      lastWatering = careRecordRepository
        .findLastWatering(record.plant.id, record.recordedAt)
        ?.let { LastWatering(amountMl = it.waterAmountMl!!, at = it.recordedAt) },
    )
  }

  private fun deviationsOf(record: CareRecord, species: Species): List<Deviation> = listOfNotNull(
    deviation("humidity", record.humidity, species.minHumidity, species.maxHumidity),
    deviation("temperature", record.temperature, species.minTemperature, species.maxTemperature),
    deviation("lightHours", record.lightHours, species.minLightHours, species.maxLightHours),
  )

  private fun deviation(measurement: String, value: Int?, min: Int, max: Int): Deviation? = when {
    value == null -> null
    value < min -> Deviation(measurement, "$value", "$min-$max", Deviation.Direction.BELOW)
    value > max -> Deviation(measurement, "$value", "$min-$max", Deviation.Direction.ABOVE)
    else -> null
  }

  private fun Species.toFacts() = SpeciesFacts(
    scientificName = scientificName,
    commonName = commonName,
    humidityRange = minHumidity..maxHumidity,
    temperatureRange = minTemperature..maxTemperature,
    lightHoursRange = minLightHours..maxLightHours,
    wateringGuideline = wateringGuideline,
  )

  private fun requireCareRecord(plantId: String, careRecordId: String): CareRecord {
    val plant = plantRepository.findOneById(PlantId.from(plantId))
      ?: throw PlantNotFoundException(plantId)
    val record = careRecordRepository.findOneById(CareRecordId.from(careRecordId))
    // Una lectura de otra planta no existe *en esta ruta*: 404, no 400.
    return record?.takeIf { it.plant.id == plant.id }
      ?: throw CareRecordNotFoundException(careRecordId)
  }

  private fun AIRecommendation.toResponse() = RecommendationResponse(
    id = id.toString(),
    careRecordId = careRecord.id.toString(),
    riskLevel = riskLevel.toString(),
    explanation = recommendationText,
    recommendedAction = recommendedAction,
    priority = priority.toString(),
    createdAt = createdAt,
  )
}

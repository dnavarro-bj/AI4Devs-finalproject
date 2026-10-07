package com.cactify.application

import com.cactify.domain.Alert
import com.cactify.domain.AlertCategory
import com.cactify.domain.AlertSeverity
import com.cactify.domain.AlertSource
import com.cactify.domain.AlertThresholds
import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.Location
import com.cactify.domain.Plant
import com.cactify.domain.RangeDeviation
import com.cactify.domain.RiskLevel
import com.cactify.domain.TaskType
import com.cactify.domain.repos.AIRecommendationRepository
import com.cactify.domain.repos.AlertQueries
import com.cactify.domain.repos.AlertRepository
import com.cactify.domain.repos.AlertTransitionRepository
import com.cactify.domain.repos.CareRecordRepository
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

/**
 * Cuántas alertas cambió una pasada del proceso programado: lo que el planificador registra y lo que
 * un test afirma.
 */
data class TimeBasedDetection(val opened: Int, val accumulated: Int)

/**
 * Detecta las condiciones que abren alertas (§17). Es el único sitio que las abre solo; las manuales
 * las abre [AlertService].
 *
 * Todas las detecciones pasan por [register], que es la regla **«una alerta abierta por condición»**:
 * si ya hay una abierta de la misma planta (o localización), origen y categoría, la acumula en lugar
 * de abrir otra; si no, abre una. El índice único parcial de `V16` la defiende en la base, y
 * [AlertQueries.lockCondition] serializa las detecciones simultáneas de una misma condición para que
 * ninguna choque con él —un choque abortaría la transacción de la lectura—.
 *
 * Una alerta **nunca se cierra aquí**: ni cuando una lectura vuelve al rango ni cuando la condición
 * desaparece. Cerrarla es siempre cosa de una persona.
 */
@Service
class AlertDetectionService(
  private val alertRepository: AlertRepository,
  private val transitionRepository: AlertTransitionRepository,
  private val queries: AlertQueries,
  private val plantRepository: PlantRepository,
  private val locationRepository: LocationRepository,
  private val careRecordRepository: CareRecordRepository,
  private val aiRecommendationRepository: AIRecommendationRepository,
  private val thresholds: AlertThresholds,
  private val clock: Clock,
) {

  // ---- Al escribir una lectura ----

  /**
   * Compara las medidas de la lectura con el **rango efectivo del ejemplar** —el de su especie con
   * sus cuidados propios—. Solo humedad, temperatura y luz tienen rango; el pH y el riego no, y no se
   * inventa uno. Corre en la transacción de la lectura: una alerta aparece con ella o no aparece.
   */
  @Transactional
  fun onReading(record: CareRecord) {
    val care = record.plant.effectiveCare()
    val checks = listOf(
      Measure(AlertCategory.Humidity, "Humedad", "%", record.humidity, care.minHumidity, care.maxHumidity),
      Measure(AlertCategory.Temperature, "Temperatura", "°C", record.temperature, care.minTemperature, care.maxTemperature),
      Measure(AlertCategory.Light, "Horas de luz", "h", record.lightHours, care.minLightHours, care.maxLightHours),
    )
    for (check in checks) {
      val value = check.value ?: continue
      val deviation = RangeDeviation.of(value, check.min, check.max) ?: continue
      register(
        plant = record.plant,
        location = null,
        source = AlertSource.Measurement,
        category = check.category,
        severity = thresholds.severityByDeviation(deviation.distance),
        reason = "${check.label} $value ${check.unit} por ${if (deviation.direction == RangeDeviation.Direction.Below) "debajo del mínimo" else "encima del máximo"} de ${deviation.limit} ${check.unit}",
        action = null,
        careRecord = record,
        at = clock.instant(),
        oncePerDay = false,
      )
    }
  }

  private class Measure(val category: AlertCategory, val label: String, val unit: String, val value: Int?, val min: Int?, val max: Int?)

  // ---- Al generarse una recomendación ----

  /**
   * Una recomendación de riesgo `high` o `medium` **enriquece** la alerta abierta de la lectura o, si
   * no hay ninguna, abre una de origen `recomendacion_ia`; `low` no hace nada. La IA no detecta sola:
   * sin ella, las alertas de medición y de tiempo siguen existiendo.
   */
  @Transactional
  fun onRecommendation(careRecordId: CareRecordId) {
    val recommendation = aiRecommendationRepository.findOneByCareRecordId(careRecordId) ?: return
    val severity = when (recommendation.riskLevel) {
      RiskLevel.High -> AlertSeverity.Critical
      RiskLevel.Medium -> AlertSeverity.Medium
      RiskLevel.Low -> return
    }
    val existing = alertRepository.findOpenByCareRecord(careRecordId).firstOrNull()
    if (existing != null) {
      existing.enrich(recommendation.recommendedAction, recommendation.recommendationText)
      return
    }
    val record = careRecordRepository.findOneById(careRecordId) ?: return
    register(
      plant = record.plant,
      location = null,
      source = AlertSource.AiRecommendation,
      category = AlertCategory.Other,
      severity = severity,
      reason = recommendation.recommendationText,
      action = recommendation.recommendedAction,
      careRecord = record,
      at = clock.instant(),
      oncePerDay = false,
    )
  }

  // ---- El proceso programado ----

  /**
   * Las dos condiciones de **tiempo**, que nadie escribe cuando ocurren: un ejemplar sin
   * observaciones y una tarea vencida. Es público y no sabe del planificador, de modo que se prueba
   * con el reloj inyectado. **Una alerta recibe como mucho una ocurrencia por día UTC**: ejecutarlo
   * dos veces el mismo día —un reinicio, dos instancias— no infla las ocurrencias ni la escalada.
   */
  @Transactional
  fun detectTimeBased(): TimeBasedDetection {
    val now = clock.instant()
    val today = LocalDate.ofInstant(now, ZoneOffset.UTC)
    var opened = 0
    var accumulated = 0
    fun tally(result: Registered?) {
      when (result) {
        Registered.Opened -> opened++
        Registered.Accumulated -> accumulated++
        else -> Unit
      }
    }

    val unobserved = queries.unobservedPlants(now.minus(Duration.ofDays(thresholds.unreviewedDays.toLong())))
    val plants = plantRepository.findAllWithLocationByIdIn(unobserved.map { it.plantId }).associateBy { it.id }
    for (item in unobserved) {
      val plant = plants[item.plantId] ?: continue
      val days = ChronoUnit.DAYS.between(item.lastObservation, now)
      tally(
        register(
          plant = plant, location = null, source = AlertSource.Unreviewed, category = AlertCategory.FollowUp,
          severity = AlertSeverity.Low, reason = "Sin observaciones durante $days días", action = "Revisar el ejemplar y anotar cómo está",
          careRecord = null, at = now, oncePerDay = true,
        ).second,
      )
    }

    val overdue = queries.overdueTasks(today.minusDays(thresholds.overdueDays.toLong()))
    val taskPlants = plantRepository.findAllWithLocationByIdIn(overdue.mapNotNull { it.plantId }).associateBy { it.id }
    for (task in overdue) {
      val days = ChronoUnit.DAYS.between(task.dueTo, today)
      val plant = task.plantId?.let { taskPlants[it] }
      val location = task.locationId?.let { locationRepository.findOneById(it) }
      if (plant == null && location == null) continue
      tally(
        register(
          plant = plant, location = location, source = AlertSource.CareOverdue,
          category = if (task.type == TaskType.Watering) AlertCategory.Watering else AlertCategory.FollowUp,
          severity = AlertSeverity.Low, reason = "Tarea vencida hace $days días: «${task.title}»", action = "Completar, reprogramar o cancelar la tarea",
          careRecord = null, at = now, oncePerDay = true,
        ).second,
      )
    }
    return TimeBasedDetection(opened, accumulated)
  }

  // ---- Sin duplicados ----

  private enum class Registered { Opened, Accumulated }

  /**
   * La regla anti-duplicados. Devuelve la alerta y qué ocurrió con ella; con [oncePerDay], una alerta
   * que ya recibió su ocurrencia hoy (UTC) no recibe otra y el resultado es `null`.
   */
  private fun register(
    plant: Plant?,
    location: Location?,
    source: AlertSource,
    category: AlertCategory,
    severity: AlertSeverity,
    reason: String,
    action: String?,
    careRecord: CareRecord?,
    at: Instant,
    oncePerDay: Boolean,
  ): Pair<Alert, Registered?> {
    queries.lockCondition("alert:${plant?.id ?: location!!.id}:$source:$category")
    val open = if (plant != null) {
      alertRepository.findOpenOfPlant(plant.id, source, category)
    } else {
      alertRepository.findOpenOfLocation(location!!.id, source, category)
    }
    if (open != null) {
      if (oncePerDay && sameUtcDay(open.lastDetectedAt, at)) return open to null
      open.recordOccurrence(severity, careRecord, at, thresholds)
      return open to Registered.Accumulated
    }
    val opened = Alert.open(plant, location, source, category, severity, reason, action, careRecord, clock)
    alertRepository.save(opened.alert)
    transitionRepository.save(opened.transition)
    return opened.alert to Registered.Opened
  }

  private fun sameUtcDay(a: Instant, b: Instant) = LocalDate.ofInstant(a, ZoneOffset.UTC) == LocalDate.ofInstant(b, ZoneOffset.UTC)
}

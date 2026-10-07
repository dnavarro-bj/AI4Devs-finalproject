package com.cactify.infrastructure

import com.cactify.application.AlertDetectionService
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * El planificador del proceso diario de «sin revisar» y «cuidado vencido». **No tiene lógica**: solo
 * llama a [AlertDetectionService.detectTimeBased], que es público y se prueba con el reloj inyectado.
 * Se apaga con `cactify.alerts.scheduler.enabled=false` y su hora es `cactify.alerts.scheduler.cron`.
 *
 * Con varias instancias del backend se ejecutaría a la vez en cada una; hoy hay una, y el índice único
 * parcial de las alertas mantiene el resultado correcto.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = ["cactify.alerts.scheduler.enabled"], havingValue = "true", matchIfMissing = true)
class AlertScheduler(private val detection: AlertDetectionService) {

  private val log = LoggerFactory.getLogger(AlertScheduler::class.java)

  @Scheduled(cron = "\${cactify.alerts.scheduler.cron:0 0 6 * * *}", zone = "UTC")
  fun run() {
    val result = detection.detectTimeBased()
    log.info("Detección de alertas por tiempo: {} abiertas, {} acumuladas", result.opened, result.accumulated)
  }
}

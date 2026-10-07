package com.cactify.infrastructure

import com.cactify.application.MediaCleanupService
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * El planificador del barrido de archivos huérfanos. **No tiene lógica**: solo llama a
 * [MediaCleanupService.sweep], que es público y se prueba con el reloj inyectado. Se apaga con
 * `cactify.media.cleanup.enabled=false` (los tests lo apagan) y su periodicidad es `cactify.media.cleanup.cron`.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = ["cactify.media.cleanup.enabled"], havingValue = "true", matchIfMissing = true)
class MediaCleanupScheduler(private val cleanup: MediaCleanupService) {

  private val log = LoggerFactory.getLogger(MediaCleanupScheduler::class.java)

  @Scheduled(cron = "\${cactify.media.cleanup.cron:0 0 4 * * SUN}", zone = "UTC")
  fun run() {
    val result = cleanup.sweep()
    log.info("Barrido de fotografías: {} huérfanos retirados, {} filas sin archivo", result.removed.size, result.missingFiles.size)
  }
}

package com.cactify.infrastructure

import com.cactify.domain.AuditingListener
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

/**
 * El único reloj del sistema (ADR-010). Todo lo que necesite saber qué hora es lo pide por
 * inyección, de modo que un test pueda congelarlo y afirmar instantes exactos.
 */
@Configuration
class TimeConfiguration {

  @Bean
  fun clock(): Clock = Clock.systemUTC()

  /**
   * El listener vive en `domain` y no conoce Spring; aquí se le da su reloj. Hibernate lo resuelve
   * desde el contenedor vía `SpringBeanContainer`: si no lo hiciera, no hay constructor sin
   * argumentos y el arranque falla, en vez de sellar fechas con otro reloj en silencio.
   */
  @Bean
  fun auditingListener(clock: Clock): AuditingListener = AuditingListener(clock)
}

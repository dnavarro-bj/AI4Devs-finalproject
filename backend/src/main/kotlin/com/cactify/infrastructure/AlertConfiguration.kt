package com.cactify.infrastructure

import com.cactify.domain.AlertThresholds
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Lo que `cactify.alerts.*` configura: los umbrales de detección y de escalada, y el proceso
 * programado de las condiciones de tiempo. Los valores por defecto son los del producto; la pantalla
 * de configuración que los expondrá es de T-29.
 */
@ConfigurationProperties("cactify.alerts")
data class AlertProperties(
  val unreviewedDays: Int = 30,
  val overdueDays: Int = 2,
  val mediumOccurrences: Int = 3,
  val criticalOccurrences: Int = 6,
  val mediumDeviation: Double = 0.25,
  val criticalDeviation: Double = 0.75,
  val scheduler: Scheduler = Scheduler(),
) {
  /** El proceso que evalúa «sin revisar» y «cuidado vencido»: se puede apagar y su hora es configurable. */
  data class Scheduler(val enabled: Boolean = true, val cron: String = "0 0 6 * * *")
}

@Configuration
@EnableConfigurationProperties(AlertProperties::class)
class AlertConfiguration {

  /** Una configuración incoherente lanza aquí y **impide arrancar** (ver [AlertThresholds]). */
  @Bean
  fun alertThresholds(properties: AlertProperties) = AlertThresholds(
    unreviewedDays = properties.unreviewedDays,
    overdueDays = properties.overdueDays,
    mediumOccurrences = properties.mediumOccurrences,
    criticalOccurrences = properties.criticalOccurrences,
    mediumDeviation = properties.mediumDeviation,
    criticalDeviation = properties.criticalDeviation,
  )
}

package com.cactify

import com.cactify.domain.AlertThresholds
import com.cactify.infrastructure.AlertConfiguration
import com.cactify.infrastructure.AlertProperties
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** Escenarios de «Umbrales en configuración». */
class AlertConfigurationTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var thresholds: AlertThresholds

  @Autowired
  lateinit var properties: AlertProperties

  @Test
  fun `the application reads the defaults of the product`() {
    assertEquals(AlertThresholds(), thresholds)
  }

  @Test
  fun `the scheduler is off in the tests and has a cron by default`() {
    assertFalse(properties.scheduler.enabled)
    assertNotNull(properties.scheduler.cron)
  }

  private val runner = ApplicationContextRunner().withUserConfiguration(AlertConfiguration::class.java)

  @Test
  fun `own values are read from the configuration`() {
    runner.withPropertyValues("cactify.alerts.unreviewed-days=45", "cactify.alerts.critical-occurrences=10").run { context ->
      val t = context.getBean(AlertThresholds::class.java)
      assertEquals(45, t.unreviewedDays)
      assertEquals(10, t.criticalOccurrences)
      assertEquals(3, t.mediumOccurrences)
    }
  }

  @Test
  fun `an incoherent configuration prevents the application from starting`() {
    runner.withPropertyValues("cactify.alerts.medium-occurrences=8", "cactify.alerts.critical-occurrences=2").run { context ->
      assertNotNull(context.startupFailure)
      assertTrue(generateSequence(context.startupFailure as Throwable?) { it.cause }.any { it.message.orEmpty().contains("ocurrencias") })
    }
  }
}

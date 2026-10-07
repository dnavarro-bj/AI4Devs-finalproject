package com.cactify

import com.cactify.application.MediaLimits
import com.cactify.infrastructure.MediaConfiguration
import com.cactify.infrastructure.MediaProperties
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** Escenarios de «Límites en configuración» (ADR-018, decisión 6). */
class MediaConfigurationTest {

  private val runner = ApplicationContextRunner().withUserConfiguration(MediaConfiguration::class.java)

  private fun startupMessages(context: org.springframework.boot.test.context.assertj.AssertableApplicationContext) =
    generateSequence(context.startupFailure as Throwable?) { it.cause }.mapNotNull { it.message }.toList()

  @Test
  fun `without configuration the limits of the product apply`() {
    runner.run { context ->
      val limits = context.getBean(MediaLimits::class.java)
      assertEquals(10L * 1024 * 1024, limits.maxFileBytes)
      assertEquals(10, limits.maxFiles)
      assertEquals(50, limits.maxPerOwner)
      assertEquals(320, limits.thumbSide)
      assertEquals(1280, limits.mediumSide)
      assertEquals(4096, limits.maxFullSide)
      assertEquals(Duration.ofDays(1), limits.orphanMinAge)
      assertTrue(context.getBean(MediaProperties::class.java).cleanup.enabled)
    }
  }

  @Test
  fun `own values are read from cactify media`() {
    runner.withPropertyValues(
      "cactify.media.max-file-size=5MB",
      "cactify.media.max-per-owner=20",
      "cactify.media.medium-side=1000",
      "cactify.media.orphan-min-age=PT6H",
    ).run { context ->
      val limits = context.getBean(MediaLimits::class.java)
      assertEquals(5L * 1024 * 1024, limits.maxFileBytes)
      assertEquals(20, limits.maxPerOwner)
      assertEquals(1000, limits.mediumSide)
      assertEquals(Duration.ofHours(6), limits.orphanMinAge)
    }
  }

  @Test
  fun `a medium side larger than the full maximum prevents the application from starting`() {
    runner.withPropertyValues("cactify.media.medium-side=5000", "cactify.media.max-full-side=4096").run { context ->
      assertNotNull(context.startupFailure)
      assertTrue(startupMessages(context).any { it.contains("media") && it.contains("4096") })
    }
  }

  @Test
  fun `a thumb larger than the medium side prevents the application from starting`() {
    runner.withPropertyValues("cactify.media.thumb-side=2000").run { context ->
      assertNotNull(context.startupFailure)
    }
  }

  @Test
  fun `a quality out of range prevents the application from starting`() {
    runner.withPropertyValues("cactify.media.quality=1.5").run { context ->
      assertNotNull(context.startupFailure)
    }
  }
}

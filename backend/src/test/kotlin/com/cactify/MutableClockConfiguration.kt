package com.cactify

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import java.time.Instant

/**
 * Sustituye el reloj del sistema por uno controlable. Los tests que necesiten afirmar instantes
 * exactos la importan con `@Import(MutableClockConfiguration::class)`.
 */
@TestConfiguration
class MutableClockConfiguration {

  @Bean
  @Primary
  fun mutableClock(): MutableClock = MutableClock(Instant.parse("2026-08-14T09:30:00Z"))
}

package com.cactify

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/**
 * Reloj de test que se puede fijar y adelantar.
 *
 * Un `Clock.fixed` no basta: con el tiempo congelado, la marca de modificación coincidiría con la
 * de creación y el escenario "Fila modificada por la aplicación" pasaría por el motivo equivocado.
 */
class MutableClock(
  private var current: Instant,
  private val zone: ZoneId = ZoneOffset.UTC,
) : Clock() {

  override fun getZone(): ZoneId = zone

  override fun withZone(zone: ZoneId): Clock = MutableClock(current, zone)

  override fun instant(): Instant = current

  fun advanceBy(duration: Duration) {
    current = current.plus(duration)
  }
}

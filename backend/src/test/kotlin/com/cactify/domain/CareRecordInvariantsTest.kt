package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Invariantes de `CareRecord`, incluida la factoría `record(...)`, que es la única puerta para
 * registrar una lectura y la que necesita el reloj para juzgar la fecha.
 */
class CareRecordInvariantsTest {

  private val now = Instant.parse("2026-08-14T09:30:00Z")
  private val clock = Clock.fixed(now, ZoneOffset.UTC)
  private val skew = Duration.ofMinutes(5)

  private val soilMix = SoilMix(
    name = "Sustrato", organicPercentage = 40, mineralPercentage = 60,
    phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"),
  )
  private val species = Species(
    scientificName = "Testus plantus", commonName = "Planta de prueba",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "semanal", soilMix = soilMix,
  )
  private val plant = Plant(nickname = "Bola", location = Location(name = "Invernadero 1"), species = species)

  private fun record(
    humidity: Int? = 35,
    temperature: Int? = null,
    lightHours: Int? = null,
    waterAmountMl: Int? = null,
    soilPh: BigDecimal? = null,
    recordedAt: Instant? = null,
  ) = CareRecord.record(
    plant = plant,
    humidity = humidity,
    temperature = temperature,
    lightHours = lightHours,
    waterAmountMl = waterAmountMl,
    soilPh = soilPh,
    recordedAt = recordedAt,
    clock = clock,
    maxFutureSkew = skew,
  )

  // --- rangos, tolerantes a nulos ---

  @Test
  fun `a measurement outside its range cannot be recorded`() {
    assertFailsWith<IllegalArgumentException> { record(humidity = 150) }
    assertFailsWith<IllegalArgumentException> { record(humidity = -5) }
    assertFailsWith<IllegalArgumentException> { record(humidity = null, lightHours = 25) }
    assertFailsWith<IllegalArgumentException> { record(humidity = null, temperature = 120) }
    assertFailsWith<IllegalArgumentException> { record(humidity = null, waterAmountMl = -1) }
    assertFailsWith<IllegalArgumentException> { record(humidity = null, soilPh = BigDecimal("15.0")) }
  }

  @Test
  fun `a partial reading with a single measurement is valid`() {
    val reading = record(humidity = 35)

    assertEquals(35, reading.humidity)
    assertEquals(null, reading.temperature)
  }

  @Test
  fun `a reading with no measurement at all cannot be recorded`() {
    val error = assertFailsWith<IllegalArgumentException> { record(humidity = null) }

    assertEquals(true, error.message!!.contains("al menos"), "el mensaje debe decir cuál es la regla")
  }

  // --- la fecha, que necesita el reloj ---

  @Test
  fun `a reading without a date takes it from the clock`() {
    assertEquals(now, record().recordedAt)
  }

  @Test
  fun `a date given by whoever took the reading is kept`() {
    val taken = Instant.parse("2026-07-01T08:00:00Z")

    assertEquals(taken, record(recordedAt = taken).recordedAt)
  }

  @Test
  fun `the date is truncated to the precision the column stores`() {
    val withNanos = Instant.parse("2026-08-01T10:00:00.479235925Z")

    assertEquals(Instant.parse("2026-08-01T10:00:00.479235Z"), record(recordedAt = withNanos).recordedAt)
  }

  @Test
  fun `a date beyond the tolerance window cannot be recorded`() {
    assertFailsWith<IllegalArgumentException> { record(recordedAt = now.plus(Duration.ofDays(1))) }
  }

  @Test
  fun `a slightly future date within the tolerance window is accepted`() {
    val slightlyAhead = now.plus(Duration.ofMinutes(2))

    assertEquals(slightlyAhead, record(recordedAt = slightlyAhead).recordedAt)
  }
}

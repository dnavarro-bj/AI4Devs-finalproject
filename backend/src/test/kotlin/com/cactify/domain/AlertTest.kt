package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Invariantes de `Alert`: apertura, ciclo de vida, acumulación de ocurrencias y escalada. */
class AlertTest {

  private val now = Instant.parse("2026-08-14T09:30:00Z")
  private val clock = Clock.fixed(now, ZoneOffset.UTC)
  private val thresholds = AlertThresholds()

  private val soilMix = SoilMix(
    name = "Sustrato", organicPercentage = 40, mineralPercentage = 60,
    phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"),
  )
  private val species = Species(
    code = "TEST-A", scientificName = "Testus plantus", commonName = "Planta de prueba",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "semanal", soilMix = soilMix,
  )
  private val location = Location(name = "Invernadero 1", code = com.cactify.locationCode("Invernadero 1"))
  private val plant = Plant(code = "TEST-A-01", nickname = "Bola", location = location, species = species)

  private fun open(
    severity: AlertSeverity = AlertSeverity.Low,
    source: AlertSource = AlertSource.Measurement,
    plant: Plant? = this.plant,
    location: Location? = null,
  ) = Alert.open(
    plant = plant, location = location, source = source, category = AlertCategory.Temperature,
    severity = severity, reason = "Temperatura 4 °C por debajo del mínimo de 10 °C",
    recommendedAction = null, careRecord = null, clock = clock,
  )

  @Test
  fun `opening an alert starts it new, with one occurrence and its opening transition`() {
    val opened = open()

    assertEquals(AlertStatus.New, opened.alert.status)
    assertEquals(1, opened.alert.occurrences)
    assertEquals(now, opened.alert.detectedAt)
    assertEquals(now, opened.alert.lastDetectedAt)
    assertNull(opened.transition.fromStatus)
    assertEquals(AlertStatus.New, opened.transition.toStatus)
    assertEquals(now, opened.transition.occurredAt)
  }

  @Test
  fun `an alert needs exactly a plant or a location`() {
    assertFailsWith<IllegalArgumentException> { open(plant = null, location = null) }
    assertFailsWith<IllegalArgumentException> { open(plant = plant, location = location) }
    assertEquals(location, open(plant = null, location = location).alert.location)
  }

  @Test
  fun `a blank reason is rejected and the text is trimmed`() {
    assertFailsWith<IllegalArgumentException> {
      Alert.open(plant, null, AlertSource.Manual, AlertCategory.Other, AlertSeverity.Low, "  ", null, null, clock)
    }
    val a = Alert.open(plant, null, AlertSource.Manual, AlertCategory.Other, AlertSeverity.Low, "  Cochinilla ", " Tratar ", null, clock).alert
    assertEquals("Cochinilla", a.reason)
    assertEquals("Tratar", a.recommendedAction)
  }

  @Test
  fun `reviewing moves new to reviewed and records it`() {
    val alert = open().alert

    val t = alert.review("Lo miro mañana", clock)

    assertEquals(AlertStatus.Reviewed, alert.status)
    assertEquals(AlertStatus.New, t.fromStatus)
    assertEquals(AlertStatus.Reviewed, t.toStatus)
    assertEquals("Lo miro mañana", t.comment)
    assertNull(alert.closedAt)
  }

  @Test
  fun `resolving stores the closing date and the comment`() {
    val alert = open().alert

    val t = alert.resolve("Movida a la sombra", clock)

    assertEquals(AlertStatus.Resolved, alert.status)
    assertEquals(now, alert.closedAt)
    assertEquals("Movida a la sombra", alert.closureComment)
    assertEquals(AlertStatus.Resolved, t.toStatus)
  }

  @Test
  fun `dismissing is a different final state from resolving`() {
    val alert = open().alert

    val t = alert.dismiss(null, clock)

    assertEquals(AlertStatus.Dismissed, alert.status)
    assertEquals(now, alert.closedAt)
    assertNull(alert.closureComment)
    assertEquals(AlertStatus.Dismissed, t.toStatus)
  }

  @Test
  fun `a blank comment is absent`() {
    val alert = open().alert

    alert.resolve("   ", clock)

    assertNull(alert.closureComment)
  }

  @Test
  fun `a final alert admits no transition and keeps everything`() {
    val alert = open().alert
    alert.resolve("ok", clock)

    assertFailsWith<InvalidAlertTransitionException> { alert.review(null, clock) }
    assertFailsWith<InvalidAlertTransitionException> { alert.resolve("otra vez", clock) }
    assertFailsWith<InvalidAlertTransitionException> { alert.dismiss(null, clock) }

    assertEquals(AlertStatus.Resolved, alert.status)
    assertEquals("ok", alert.closureComment)
  }

  @Test
  fun `reviewing a reviewed alert is rejected`() {
    val alert = open().alert
    alert.review(null, clock)

    assertFailsWith<InvalidAlertTransitionException> { alert.review(null, clock) }
  }

  @Test
  fun `a reviewed alert can be resolved or dismissed`() {
    val a = open().alert.also { it.review(null, clock) }
    val b = open().alert.also { it.review(null, clock) }

    a.resolve(null, clock)
    b.dismiss(null, clock)

    assertEquals(AlertStatus.Resolved, a.status)
    assertEquals(AlertStatus.Dismissed, b.status)
  }

  @Test
  fun `an occurrence adds one, moves the last detection and keeps the first`() {
    val alert = open().alert
    val later = now.plus(Duration.ofHours(3))

    alert.recordOccurrence(AlertSeverity.Low, null, later, thresholds)

    assertEquals(2, alert.occurrences)
    assertEquals(later, alert.lastDetectedAt)
    assertEquals(now, alert.detectedAt)
  }

  @Test
  fun `severity escalates with the number of occurrences`() {
    val alert = open(AlertSeverity.Low).alert

    repeat(2) { alert.recordOccurrence(AlertSeverity.Low, null, now, thresholds) }
    assertEquals(AlertSeverity.Medium, alert.severity, "3 ocurrencias")
    repeat(3) { alert.recordOccurrence(AlertSeverity.Low, null, now, thresholds) }
    assertEquals(AlertSeverity.Critical, alert.severity, "6 ocurrencias")
  }

  @Test
  fun `a graver detection raises severity at once`() {
    val alert = open(AlertSeverity.Low).alert

    alert.recordOccurrence(AlertSeverity.Critical, null, now, thresholds)

    assertEquals(AlertSeverity.Critical, alert.severity)
  }

  @Test
  fun `severity never goes down`() {
    val alert = open(AlertSeverity.Critical).alert

    alert.recordOccurrence(AlertSeverity.Low, null, now, thresholds)

    assertEquals(AlertSeverity.Critical, alert.severity)
  }

  @Test
  fun `a reviewed alert still accumulates`() {
    val alert = open().alert
    alert.review(null, clock)

    alert.recordOccurrence(AlertSeverity.Low, null, now, thresholds)

    assertEquals(2, alert.occurrences)
    assertEquals(AlertStatus.Reviewed, alert.status)
  }

  @Test
  fun `a closed alert accepts no occurrences`() {
    val alert = open().alert
    alert.dismiss(null, clock)

    assertFailsWith<IllegalStateException> { alert.recordOccurrence(AlertSeverity.Low, null, now, thresholds) }

    assertEquals(1, alert.occurrences)
  }

  @Test
  fun `an occurrence never moves the last detection backwards`() {
    val alert = open().alert

    alert.recordOccurrence(AlertSeverity.Low, null, now.minus(Duration.ofDays(1)), thresholds)

    assertEquals(now, alert.lastDetectedAt)
  }

  @Test
  fun `enriching replaces the action and appends the text, keeping source, status and severity`() {
    val alert = open(AlertSeverity.Medium).alert

    alert.enrich("Mover a un sitio más cálido", "La temperatura baja daña el cactus.")

    assertEquals("Mover a un sitio más cálido", alert.recommendedAction)
    assertTrue(alert.reason.startsWith("Temperatura 4 °C"))
    assertTrue(alert.reason.contains("La temperatura baja daña el cactus."))
    assertEquals(AlertSource.Measurement, alert.source)
    assertEquals(AlertStatus.New, alert.status)
    assertEquals(AlertSeverity.Medium, alert.severity)
  }

  @Test
  fun `a rejected transition leaves no trace`() {
    val alert = open().alert
    alert.dismiss("no", clock)

    assertFalse(runCatching { alert.resolve("sí", clock) }.isSuccess)

    assertEquals(AlertStatus.Dismissed, alert.status)
    assertEquals("no", alert.closureComment)
  }
}

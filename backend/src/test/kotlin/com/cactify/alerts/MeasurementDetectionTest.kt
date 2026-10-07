package com.cactify.alerts

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Escenarios de «Detección de una medición fuera de rango» y «Sin duplicados: una alerta abierta por condición, con escalada». */
class MeasurementDetectionTest : AbstractAlertTest() {

  @Test
  fun `a temperature below the minimum opens a measurement alert linked to the reading`() {
    val plant = newPlant()

    val record = reading(plant, temperature = 2)

    val alert = alertsOf(plant).single()
    assertEquals("medicion", alert["source"])
    assertEquals("temperatura", alert["category"])
    assertEquals("nueva", alert["status"])
    assertEquals(1, alert["occurrences"])
    assertEquals(record.id, alert["care_record_id"].toString())
    assertTrue((alert["reason"] as String).contains("2 °C") && (alert["reason"] as String).contains("10 °C"), alert["reason"].toString())
    assertTrue((alert["reason"] as String).contains("por debajo del mínimo"))
  }

  @Test
  fun `a measure above the maximum says so`() {
    val plant = newPlant()

    reading(plant, humidity = 45)

    val reason = alertsOf(plant).single()["reason"] as String
    assertTrue(reason.contains("Humedad 45 %") && reason.contains("por encima del máximo de 30 %"), reason)
  }

  @Test
  fun `the opening is the first transition`() {
    val plant = newPlant()
    reading(plant, temperature = 2)

    val transitions = transitionsOf(alertsOf(plant).single()["id"])

    assertEquals(1, transitions.size)
    assertNull(transitions.single()["from_status"])
    assertEquals("nueva", transitions.single()["to_status"])
  }

  @Test
  fun `the plants own range is used and not only the species one`() {
    val plant = newPlant()
    jdbcTemplate.update("UPDATE plant SET care_min_humidity = 5, care_max_humidity = 15 WHERE id = ?", plant.toLong())

    reading(plant, humidity = 20)

    val alert = alertsOf(plant).single()
    assertEquals("humedad", alert["category"])
  }

  @Test
  fun `severity comes from the distance to the range`() {
    val low = newPlant()
    val critical = newPlant()

    reading(low, temperature = 8) // 2 por debajo de un rango de 25: 8 %
    reading(critical, temperature = -20) // 30 por debajo: 120 %

    assertEquals("baja", alertsOf(low).single()["severity"])
    assertEquals("critica", alertsOf(critical).single()["severity"])
  }

  @Test
  fun `a medium distance is a medium alert`() {
    val plant = newPlant()

    reading(plant, temperature = 3) // 7 por debajo de 25: 28 %

    assertEquals("media", alertsOf(plant).single()["severity"])
  }

  @Test
  fun `a reading inside the range opens nothing`() {
    val plant = newPlant()

    reading(plant, humidity = 20, temperature = 22, light = 8)

    assertTrue(alertsOf(plant).isEmpty())
  }

  @Test
  fun `a partial reading opens only the alert of the measure present`() {
    val plant = newPlant()

    reading(plant, humidity = 60)

    assertEquals(listOf("humedad"), alertsOf(plant).map { it["category"] })
  }

  @Test
  fun `acidity and watering are not evaluated`() {
    val plant = newPlant()

    reading(plant, water = 0, ph = BigDecimal("13.5"))

    assertTrue(alertsOf(plant).isEmpty())
  }

  @Test
  fun `several measures out of range open one alert each, all linked to the reading`() {
    val plant = newPlant()

    val record = reading(plant, humidity = 60, temperature = 2, light = 1)

    val alerts = alertsOf(plant)
    assertEquals(setOf("humedad", "temperatura", "luz"), alerts.map { it["category"] }.toSet())
    assertTrue(alerts.all { it["care_record_id"].toString() == record.id })
  }

  // ---- Sin duplicados ----

  @Test
  fun `a second reading out of range accumulates instead of opening another alert`() {
    val plant = newPlant()
    reading(plant, temperature = 8)
    clock.advanceBy(Duration.ofHours(3))

    val second = reading(plant, temperature = 7)

    val alert = alertsOf(plant).single()
    assertEquals(2, alert["occurrences"])
    assertEquals(second.id, alert["care_record_id"].toString())
    assertEquals(clock.instant(), instant(alert["last_detected_at"]))
    assertTrue(instant(alert["detected_at"]).isBefore(instant(alert["last_detected_at"])))
  }

  @Test
  fun `a second detection adds no transition`() {
    val plant = newPlant()
    reading(plant, temperature = 8)
    reading(plant, temperature = 7)

    assertEquals(1, transitionsOf(alertsOf(plant).single()["id"]).size)
  }

  @Test
  fun `severity escalates with occurrences`() {
    val plant = newPlant()

    reading(plant, temperature = 8)
    reading(plant, temperature = 8)
    assertEquals("baja", alertsOf(plant).single()["severity"])
    reading(plant, temperature = 8)
    assertEquals("media", alertsOf(plant).single()["severity"], "3 ocurrencias")
    repeat(3) { reading(plant, temperature = 8) }
    assertEquals("critica", alertsOf(plant).single()["severity"], "6 ocurrencias")
  }

  @Test
  fun `a graver reading raises severity at once`() {
    val plant = newPlant()
    reading(plant, temperature = 8)

    reading(plant, temperature = -20)

    assertEquals("critica", alertsOf(plant).single()["severity"])
  }

  @Test
  fun `severity never goes down`() {
    val plant = newPlant()
    reading(plant, temperature = -20)

    reading(plant, temperature = 9)

    assertEquals("critica", alertsOf(plant).single()["severity"])
  }

  @Test
  fun `a reviewed alert is still the open one and accumulates`() {
    val plant = newPlant()
    reading(plant, temperature = 8)
    flushPersistenceContext()
    jdbcTemplate.update("UPDATE alert SET status = 'revisada' WHERE plant_id = ?", plant.toLong())
    entityManager.clear()

    reading(plant, temperature = 8)

    val alert = alertsOf(plant).single()
    assertEquals(2, alert["occurrences"])
    assertEquals("revisada", alert["status"])
  }

  @Test
  fun `a closed alert is not reopened and a new one starts`() {
    val plant = newPlant()
    reading(plant, temperature = 8)
    flushPersistenceContext()
    jdbcTemplate.update("UPDATE alert SET status = 'resuelta', closed_at = now() WHERE plant_id = ?", plant.toLong())
    entityManager.clear()

    reading(plant, temperature = 8)

    val alerts = alertsOf(plant)
    assertEquals(2, alerts.size)
    assertEquals(listOf("resuelta", "nueva"), alerts.map { it["status"] })
    assertEquals(listOf(1, 1), alerts.map { it["occurrences"] })
  }

  @Test
  fun `different categories do not mix`() {
    val plant = newPlant()
    reading(plant, temperature = 8)

    reading(plant, humidity = 60)

    assertEquals(setOf("temperatura", "humedad"), alertsOf(plant).map { it["category"] }.toSet())
  }

  @Test
  fun `a reading back in range closes nothing`() {
    val plant = newPlant()
    reading(plant, temperature = 8)

    reading(plant, temperature = 22)

    val alert = alertsOf(plant).single()
    assertEquals("nueva", alert["status"])
    assertEquals(1, alert["occurrences"])
  }

  @Test
  fun `the readings of another plant do not mix`() {
    val a = newPlant()
    val b = newPlant()

    reading(a, temperature = 8)
    reading(b, temperature = 8)

    assertEquals(1, alertsOf(a).size)
    assertEquals(1, alertsOf(b).size)
  }
}

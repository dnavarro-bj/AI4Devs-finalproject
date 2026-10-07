package com.cactify.domain

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

/** Invariantes de los tres eventos nuevos: comentario, intervención y floración observada. */
class PlantEventsTest {

  private val now = Instant.parse("2026-08-14T09:30:00Z")
  private val clock = Clock.fixed(now, ZoneOffset.UTC)
  private val skew = Duration.ofMinutes(5)

  private val soilMix = SoilMix(
    name = "Sustrato", organicPercentage = 40, mineralPercentage = 60,
    phMin = BigDecimal("5.5"), phMax = BigDecimal("6.5"),
  )
  private val species = Species(
    code = "TEST-A", scientificName = "Testus plantus", commonName = "Planta de prueba",
    minHumidity = 10, maxHumidity = 30, minTemperature = 10, maxTemperature = 35,
    minLightHours = 6, maxLightHours = 10, wateringGuideline = "semanal", soilMix = soilMix,
  )
  private val plant = Plant(
    code = "TEST-A-01", nickname = "Bola", species = species,
    location = Location(name = "Invernadero 1", code = com.cactify.locationCode("Invernadero 1")),
  )

  // ---- Comentario ----

  private fun comment(text: String = "Marca en el lado oeste", at: Instant? = null) =
    PlantComment.record(plant, text, at, clock, skew)

  @Test
  fun `a comment trims its text and takes the clock instant by default`() {
    val c = comment("  Marca  ")

    assertEquals("Marca", c.text)
    assertEquals(now, c.occurredAt)
    assertNull(c.editedAt)
  }

  @Test
  fun `a blank comment is rejected`() {
    assertFailsWith<IllegalArgumentException> { comment("   ") }
  }

  @Test
  fun `a comment cannot be in the future`() {
    assertFailsWith<IllegalArgumentException> { comment(at = now.plus(Duration.ofHours(1))) }
  }

  @Test
  fun `a comment keeps a past instant`() {
    val past = now.minus(Duration.ofDays(21))

    assertEquals(past, comment(at = past).occurredAt)
  }

  @Test
  fun `editing a comment sets editedAt and keeps its instant`() {
    val past = now.minus(Duration.ofDays(3))
    val c = comment(at = past)

    c.edit("Texto corregido", clock)

    assertEquals("Texto corregido", c.text)
    assertEquals(past, c.occurredAt)
    assertEquals(now, c.editedAt)
  }

  @Test
  fun `a rejected edit touches nothing`() {
    val c = comment("Original")

    assertFailsWith<IllegalArgumentException> { c.edit("  ", clock) }

    assertEquals("Original", c.text)
    assertNull(c.editedAt)
  }

  // ---- Intervención ----

  private fun intervention(
    type: InterventionType,
    product: String? = null,
    pot: String? = null,
    mix: SoilMix? = null,
    notes: String? = null,
    at: Instant? = null,
  ) = PlantIntervention.record(plant, type, product, pot, mix, notes, at, clock, skew)

  @Test
  fun `each type takes its own data`() {
    assertEquals("12 cm", intervention(InterventionType.Transplant, pot = "12 cm").potSize)
    assertEquals(soilMix, intervention(InterventionType.Substrate, mix = soilMix).soilMix)
    assertEquals("NPK", intervention(InterventionType.Treatment, product = "NPK").product)
    assertEquals("NPK", intervention(InterventionType.Fertilization, product = "NPK").product)
    intervention(InterventionType.Pruning)
    intervention(InterventionType.Review)
  }

  @Test
  fun `data that is not of its type is rejected`() {
    val pot = assertFailsWith<IllegalArgumentException> { intervention(InterventionType.Pruning, pot = "12 cm") }
    assertEquals(true, pot.message!!.contains("potSize"))
    assertFailsWith<IllegalArgumentException> { intervention(InterventionType.Transplant, product = "NPK") }
    assertFailsWith<IllegalArgumentException> { intervention(InterventionType.Treatment, mix = soilMix) }
  }

  @Test
  fun `blank optional texts are absent`() {
    val i = intervention(InterventionType.Treatment, product = "  ", notes = " ")

    assertNull(i.product)
    assertNull(i.notes)
  }

  @Test
  fun `an intervention cannot be in the future`() {
    assertFailsWith<IllegalArgumentException> { intervention(InterventionType.Pruning, at = now.plus(Duration.ofDays(1))) }
  }

  @Test
  fun `replacing an intervention replaces everything, type included`() {
    val i = intervention(InterventionType.Treatment, product = "Jabón", notes = "Cochinilla")

    i.replace(InterventionType.Transplant, null, "12 cm", null, null, null, clock, skew)

    assertEquals(InterventionType.Transplant, i.type)
    assertEquals("12 cm", i.potSize)
    assertNull(i.product)
    assertNull(i.notes)
    assertEquals(now, i.occurredAt, "sin fecha nueva conserva la que tenía")
  }

  @Test
  fun `a rejected replacement leaves the intervention as it was`() {
    val i = intervention(InterventionType.Treatment, product = "Jabón")

    assertFailsWith<IllegalArgumentException> {
      i.replace(InterventionType.Pruning, "Jabón", "12 cm", null, null, null, clock, skew)
    }

    assertEquals(InterventionType.Treatment, i.type)
    assertEquals("Jabón", i.product)
    assertNull(i.potSize)
  }

  // ---- Floración ----

  private fun bloom(
    status: BloomStatus = BloomStatus.InBloom,
    start: LocalDate = LocalDate.parse("2026-05-01"),
    end: LocalDate? = null,
    flowers: Int? = null,
  ) = PlantBloom.record(plant, start, end, status, flowers, null, clock)

  @Test
  fun `an open bloom is accepted and its instant is the start at midnight UTC`() {
    val b = bloom(start = LocalDate.parse("2026-05-01"))

    assertEquals(Instant.parse("2026-05-01T00:00:00Z"), b.occurredAt)
    assertNull(b.endedOn)
  }

  @Test
  fun `a finished bloom needs an end and only a finished one admits it`() {
    bloom(BloomStatus.Finished, end = LocalDate.parse("2026-05-10"))
    assertFailsWith<IllegalArgumentException> { bloom(BloomStatus.Finished) }
    assertFailsWith<IllegalArgumentException> { bloom(BloomStatus.InBloom, end = LocalDate.parse("2026-05-10")) }
    assertFailsWith<IllegalArgumentException> { bloom(BloomStatus.Bud, end = LocalDate.parse("2026-05-10")) }
  }

  @Test
  fun `an end before the start is rejected`() {
    assertFailsWith<IllegalArgumentException> {
      bloom(BloomStatus.Finished, start = LocalDate.parse("2026-05-10"), end = LocalDate.parse("2026-05-01"))
    }
  }

  @Test
  fun `a negative flower count is rejected`() {
    assertFailsWith<IllegalArgumentException> { bloom(flowers = -1) }
    assertEquals(0, bloom(flowers = 0).flowerCount)
  }

  @Test
  fun `a bloom cannot start or end in the future`() {
    assertFailsWith<IllegalArgumentException> { bloom(start = LocalDate.parse("2026-08-15")) }
    assertFailsWith<IllegalArgumentException> {
      bloom(BloomStatus.Finished, start = LocalDate.parse("2026-08-01"), end = LocalDate.parse("2026-08-15"))
    }
  }

  @Test
  fun `replacing a bloom closes it and moves its instant with the start`() {
    val b = bloom()

    b.replace(LocalDate.parse("2026-04-20"), LocalDate.parse("2026-05-10"), BloomStatus.Finished, 12, "Bonita", clock)

    assertEquals(BloomStatus.Finished, b.status)
    assertEquals(LocalDate.parse("2026-05-10"), b.endedOn)
    assertEquals(Instant.parse("2026-04-20T00:00:00Z"), b.occurredAt)
  }

  @Test
  fun `a rejected bloom replacement leaves it as it was`() {
    val b = bloom()

    assertFailsWith<IllegalArgumentException> {
      b.replace(LocalDate.parse("2026-04-20"), null, BloomStatus.Finished, null, null, clock)
    }

    assertEquals(BloomStatus.InBloom, b.status)
    assertEquals(LocalDate.parse("2026-05-01"), b.startedOn)
  }
}

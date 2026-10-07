package com.cactify.domain

import com.cactify.MutableClock
import org.junit.jupiter.api.Test
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

/** Las invariantes del archivo de una fotografía (ADR-011): se validan antes de asignar. */
class MediaAssetTest {

  private val clock = MutableClock(Instant.parse("2026-08-14T09:30:00Z"))
  private val skew = Duration.ofMinutes(5)

  private fun asset(
    altText: String = "Una foto",
    width: Int = 800,
    height: Int = 600,
    size: Long = 1000,
    capturedAt: Instant? = null,
    contentType: String = "image/jpeg",
  ) = MediaAsset.create(contentType, width, height, size, altText, capturedAt, clock, skew)

  @Test
  fun `a valid asset derives its storage key from its id`() {
    val asset = asset()

    assertEquals("media/${asset.id}", asset.storageKey)
    assertEquals(800, asset.width)
    assertNull(asset.capturedAt)
  }

  @Test
  fun `the alt text is trimmed`() {
    assertEquals("Flor amarilla", asset(altText = "  Flor amarilla  ").altText)
  }

  @Test
  fun `a blank alt text is rejected`() {
    assertFailsWith<IllegalArgumentException> { asset(altText = "   ") }
  }

  @Test
  fun `dimensions and size must be positive`() {
    assertFailsWith<IllegalArgumentException> { asset(width = 0) }
    assertFailsWith<IllegalArgumentException> { asset(height = -1) }
    assertFailsWith<IllegalArgumentException> { asset(size = 0) }
  }

  @Test
  fun `only the stored formats are accepted`() {
    asset(contentType = "image/png")
    assertFailsWith<IllegalArgumentException> { asset(contentType = "image/gif") }
  }

  @Test
  fun `a capture date in the past is kept truncated to microseconds`() {
    val taken = Instant.parse("2026-08-14T08:00:00.123456789Z")

    assertEquals(Instant.parse("2026-08-14T08:00:00.123456Z"), asset(capturedAt = taken).capturedAt)
  }

  @Test
  fun `a capture date in the future is rejected against the clock`() {
    assertFailsWith<IllegalArgumentException> { asset(capturedAt = Instant.parse("2026-08-15T09:30:00Z")) }
    asset(capturedAt = Instant.parse("2026-08-14T09:33:00Z"))
  }

  @Test
  fun `the alt text can be corrected but not blanked`() {
    val asset = asset()

    asset.correctAltText(" Otra ")
    assertEquals("Otra", asset.altText)
    assertFailsWith<IllegalArgumentException> { asset.correctAltText("") }
    assertEquals("Otra", asset.altText)
  }

  @Test
  fun `the capture date can be corrected or cleared`() {
    val asset = asset(capturedAt = Instant.parse("2026-08-01T00:00:00Z"))

    asset.correctCapturedAt(Instant.parse("2026-07-01T00:00:00Z"), clock, skew)
    assertEquals(Instant.parse("2026-07-01T00:00:00Z"), asset.capturedAt)
    assertFailsWith<IllegalArgumentException> { asset.correctCapturedAt(Instant.parse("2027-01-01T00:00:00Z"), clock, skew) }
    assertEquals(Instant.parse("2026-07-01T00:00:00Z"), asset.capturedAt)
    asset.correctCapturedAt(null, clock, skew)
    assertNull(asset.capturedAt)
  }
}

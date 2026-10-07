package com.cactify

import com.cactify.application.MediaCleanupService
import com.cactify.application.MediaLimits
import com.cactify.domain.MediaAsset
import com.cactify.domain.MediaAssetId
import com.cactify.domain.repos.MediaAssetRepository
import com.cactify.infrastructure.MediaCleanupScheduler
import com.cactify.infrastructure.storage.DiskMediaStorage
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.ApplicationContext
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.time.Duration
import java.time.Instant
import kotlin.io.path.exists
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Escenarios de «Barrido de archivos huérfanos» con el reloj mutable y un directorio temporal. */
class MediaCleanupTest : AbstractIntegrationTest() {

  @TempDir
  lateinit var root: Path

  @Autowired
  lateinit var assets: MediaAssetRepository

  @Autowired
  lateinit var context: ApplicationContext

  private val clock = MutableClock(Instant.parse("2026-08-14T09:30:00Z"))
  private lateinit var service: MediaCleanupService
  private lateinit var storage: DiskMediaStorage

  @BeforeEach
  fun setUp() {
    storage = DiskMediaStorage(root)
    service = MediaCleanupService(storage, assets, MediaLimits(orphanMinAge = Duration.ofDays(1)), clock)
  }

  /** Una carpeta del almacén con sus tres variantes y la fecha de modificación pedida. */
  private fun folder(id: Long, ageOf: Duration) {
    listOf("thumb", "medium", "full").forEach { storage.save("media/$id/$it", byteArrayOf(1, 2, 3)) }
    Files.setLastModifiedTime(root.resolve("media/$id"), FileTime.from(clock.instant().minus(ageOf)))
  }

  private fun referenced(id: Long, withFiles: Boolean = true, ageOf: Duration = Duration.ofDays(30)): MediaAsset {
    val asset = assets.save(
      MediaAsset.create("image/jpeg", 10, 10, 100, "x", null, clock, Duration.ofMinutes(5), MediaAssetId.from(id)),
    )
    assets.flush()
    if (withFiles) folder(id, ageOf)
    return asset
  }

  @Test
  fun `an old orphan is removed`() {
    folder(111, Duration.ofDays(3))

    val result = service.sweep()

    assertEquals(listOf("media/111"), result.removed)
    assertFalse(root.resolve("media/111").exists())
  }

  @Test
  fun `a recent orphan is respected`() {
    folder(112, Duration.ofHours(1))

    val result = service.sweep()

    assertEquals(emptyList(), result.removed)
    assertTrue(storage.exists("media/112/full"))
  }

  @Test
  fun `it becomes removable once the clock moves past the minimum age`() {
    folder(113, Duration.ofHours(1))
    assertEquals(emptyList(), service.sweep().removed)

    clock.advanceBy(Duration.ofDays(2))

    assertEquals(listOf("media/113"), service.sweep().removed)
  }

  @Test
  fun `a referenced photo is never touched however old`() {
    referenced(114)

    val result = service.sweep()

    assertEquals(emptyList(), result.removed)
    assertTrue(storage.exists("media/114/full"))
  }

  @Test
  fun `only the orphans are removed from a mixed store`() {
    referenced(115)
    folder(116, Duration.ofDays(9))
    folder(117, Duration.ofMinutes(5))
    referenced(118)

    val result = service.sweep()

    assertEquals(listOf("media/116"), result.removed)
    assertTrue(listOf(115, 117, 118).all { storage.exists("media/$it/full") })
  }

  @Test
  fun `a row without file is only reported and no row changes`() {
    val lost = referenced(119, withFiles = false)

    val result = service.sweep()

    assertEquals(listOf(lost.id.toString()), result.missingFiles)
    assertEquals(emptyList(), result.removed)
    assertEquals(lost.id, assets.findOneById(lost.id)?.id)
  }

  @Test
  fun `a row that lost only one variant is reported too`() {
    referenced(120)
    storage.delete("media/120/medium")

    assertEquals(listOf("120"), service.sweep().missingFiles)
  }

  @Test
  fun `a folder that is not an identifier is not ours and stays`() {
    storage.save("media/notas/leeme.txt", byteArrayOf(1))
    Files.setLastModifiedTime(root.resolve("media/notas"), FileTime.from(clock.instant().minus(Duration.ofDays(90))))

    val result = service.sweep()

    assertEquals(emptyList(), result.removed)
    assertTrue(storage.exists("media/notas/leeme.txt"))
  }

  @Test
  fun `nothing outside the root is touched`() {
    val outside = Files.createTempFile("cactify-outside", ".txt")
    try {
      folder(121, Duration.ofDays(3))

      service.sweep()

      assertTrue(outside.exists())
    } finally {
      Files.deleteIfExists(outside)
    }
  }

  @Test
  fun `an empty store sweeps nothing`() {
    val result = service.sweep()

    assertEquals(emptyList(), result.removed)
    assertEquals(emptyList(), result.missingFiles)
  }

  @Test
  fun `the scheduler is off in the tests`() {
    assertTrue(context.getBeansOfType(MediaCleanupScheduler::class.java).isEmpty())
  }
}

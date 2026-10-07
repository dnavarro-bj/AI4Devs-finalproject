package com.cactify

import com.cactify.application.InvalidMediaException
import com.cactify.application.MediaService
import com.cactify.application.MediaTooLargeException
import com.cactify.application.UploadedFile
import com.cactify.domain.ImageVariant
import com.cactify.domain.MediaAsset
import com.cactify.domain.repos.MediaAssetRepository
import com.cactify.application.ports.MediaStorage
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.transaction.TestTransaction
import java.io.IOException
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** La subida y el borrado de fotografías contra un almacén que falla a voluntad (ADR-018, decisiones 4 y 8). */
@Import(ControllableMediaStorageConfiguration::class)
class MediaServiceTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var service: MediaService

  @Autowired
  lateinit var storage: MediaStorage

  @Autowired
  lateinit var assets: MediaAssetRepository

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private val controllable get() = storage as ControllableMediaStorage

  @AfterEach
  fun resetStorage() = controllable.reset()

  private fun file(bytes: ByteArray = TestImages.jpeg(400, 300)) = UploadedFile(bytes)

  private fun folders() = storage.listFolders("media").map { it.key }.toSet()

  private fun rows() = jdbc.queryForObject("SELECT count(*) FROM media_asset", Long::class.java)!!

  private fun upload(vararg files: UploadedFile, alt: String = "Una foto", capturedAt: Instant? = null) =
    service.upload(files.toList(), alt, capturedAt) { it }

  @Test
  fun `an upload stores the three variants of every file and one row each`() {
    val created = upload(file(), file())

    assertEquals(2, created.size)
    created.forEach { asset ->
      ImageVariant.entries.forEach { assertTrue(storage.exists("${asset.storageKey}/${it.value}"), "falta ${it.value}") }
      assertEquals("image/jpeg", asset.contentType)
      assertEquals(400 to 300, asset.width to asset.height)
      assertEquals("Una foto", asset.altText)
    }
    assertEquals(2L, rows())
  }

  @Test
  fun `one invalid file invalidates the upload and nothing is left behind`() {
    val before = folders()

    val error = assertFailsWith<InvalidMediaException> { upload(file(), file(), file(TestImages.corruptJpeg()), file()) }

    assertTrue(error.message!!.contains("3"), "dice cuál: ${error.message}")
    assertEquals(0L, rows())
    assertEquals(before, folders())
  }

  @Test
  fun `a file over the size limit answers too large and stores nothing`() {
    val before = folders()

    assertFailsWith<MediaTooLargeException> { upload(file(), file(ByteArray(10 * 1024 * 1024 + 1))) }

    assertEquals(before, folders())
    assertEquals(0L, rows())
  }

  @Test
  fun `no files and too many files are rejected`() {
    assertFailsWith<InvalidMediaException> { service.upload(emptyList(), "x", null) { it } }
    assertFailsWith<InvalidMediaException> { service.upload(List(11) { file() }, "x", null) { it } }
    assertEquals(0L, rows())
  }

  @Test
  fun `a blank alt text is rejected before anything is written`() {
    val before = folders()

    assertFailsWith<IllegalArgumentException> { upload(file(), alt = "   ") }

    assertEquals(before, folders())
  }

  @Test
  fun `a failure saving the row removes the files already written`() {
    val before = folders()

    assertFailsWith<IllegalStateException> {
      service.upload(listOf(file(), file()), "x", null) { _ -> error("la base rechazó la fila") }
    }

    assertEquals(before, folders())
  }

  @Test
  fun `a failure of the database itself removes the files already written`() {
    val before = folders()

    assertFailsWith<Exception> {
      service.upload(listOf(file()), "x", null) { created ->
        // Una fila que la base rechaza: el satélite apunta a una especie que no existe.
        jdbc.update("INSERT INTO species_media (media_id, species_id, position, is_primary) VALUES (?, 1, 0, false)", created.single().id.id)
        created
      }
    }

    assertEquals(before, folders())
  }

  @Test
  fun `a failure writing a file removes the ones written before and stores no row`() {
    val before = folders()
    controllable.failOnSaveNumber = 4 // la primera variante de la segunda imagen

    assertFailsWith<IOException> { upload(file(), file()) }

    assertEquals(before, folders())
    assertEquals(0L, rows())
  }

  @Test
  fun `an explicit capture date wins over the exif`() {
    val explicit = Instant.now().minus(10, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MICROS)

    val asset = upload(file(TestImages.jpeg(100, 100, takenAt = "2020:01:02 03:04:05")), capturedAt = explicit).single()

    assertEquals(explicit, asset.capturedAt)
  }

  @Test
  fun `without an explicit date the exif capture date is kept`() {
    val asset = upload(file(TestImages.jpeg(100, 100, takenAt = "2020:01:02 03:04:05"))).single()

    assertEquals(Instant.parse("2020-01-02T03:04:05Z"), asset.capturedAt)
  }

  @Test
  fun `an exif date in the future is ignored instead of rejecting the upload`() {
    val asset = upload(file(TestImages.jpeg(100, 100, takenAt = "2099:01:01 00:00:00"))).single()

    assertNull(asset.capturedAt)
  }

  @Test
  fun `an explicit date in the future is rejected`() {
    assertFailsWith<IllegalArgumentException> { upload(file(), capturedAt = Instant.now().plus(2, ChronoUnit.DAYS)) }
  }

  @Test
  fun `the name of the file never reaches the store`() {
    val asset = upload(UploadedFile(TestImages.jpeg(100, 100))).single()

    assertEquals("media/${asset.id}", asset.storageKey)
    assertTrue(folders().all { it.removePrefix("media/").all(Char::isDigit) }, "solo identificadores: ${folders()}")
  }

  // ---- Borrado: primero la fila, después los archivos, y solo si se confirma ----

  private fun commit() {
    TestTransaction.flagForCommit()
    TestTransaction.end()
  }

  /** Deja una transacción abierta para el cierre del test, que la revertirá. */
  private fun reopen() = TestTransaction.start()

  private fun persisted(): MediaAsset = upload(file()).single()

  @Test
  fun `deleting removes the row now and the files after the commit`() {
    val asset = persisted()
    val key = asset.storageKey

    service.delete(asset)
    assets.flush()

    assertEquals(0L, rows())
    assertTrue(storage.exists("$key/full"), "los archivos siguen hasta que se confirma")
    commit()

    ImageVariant.entries.forEach { assertFalse(storage.exists("$key/${it.value}"), "sobra ${it.value}") }
    reopen()
  }

  @Test
  fun `a rolled back deletion removes no file`() {
    val asset = persisted()
    val key = asset.storageKey

    service.delete(asset)
    TestTransaction.flagForRollback()
    TestTransaction.end()

    ImageVariant.entries.forEach { assertTrue(storage.exists("$key/${it.value}"), "faltó ${it.value}") }
    storage.deleteFolder(key)
    reopen()
  }

  @Test
  fun `a failure removing a file does not undo the deletion`() {
    val asset = persisted()
    val key = asset.storageKey
    controllable.failOnDelete = true

    service.delete(asset)
    assets.flush()
    commit()

    assertEquals(0L, rows(), "la fila no vuelve")
    assertTrue(storage.exists("$key/full"), "el archivo queda para el barrido")
    controllable.failOnDelete = false
    storage.deleteFolder(key)
    reopen()
  }
}

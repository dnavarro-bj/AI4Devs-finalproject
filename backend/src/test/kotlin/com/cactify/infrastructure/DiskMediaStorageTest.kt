package com.cactify.infrastructure

import com.cactify.infrastructure.storage.DiskMediaStorage
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.time.Instant
import kotlin.io.path.exists
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** El adaptador de disco del puerto `MediaStorage` (ADR-018, decisión 1). */
class DiskMediaStorageTest {

  @TempDir
  lateinit var root: Path

  private fun storage() = DiskMediaStorage(root)

  @Test
  fun `a saved file can be opened with its size`() {
    val content = byteArrayOf(1, 2, 3, 4)

    storage().save("media/123/thumb", content)

    val opened = storage().open("media/123/thumb")!!
    assertEquals(4, opened.size)
    assertContentEquals(content, opened.content.use { it.readAllBytes() })
    assertTrue(storage().exists("media/123/thumb"))
  }

  @Test
  fun `opening a missing file answers null`() {
    assertNull(storage().open("media/999/thumb"))
    assertFalse(storage().exists("media/999/thumb"))
  }

  @Test
  fun `writing is atomic and leaves no temporary files`() {
    storage().save("media/123/full", ByteArray(10_000) { it.toByte() })
    storage().save("media/123/full", ByteArray(5))

    val names = Files.list(root.resolve("media/123")).use { stream -> stream.map { it.fileName.toString() }.toList() }
    assertEquals(listOf("full"), names)
    assertEquals(5, storage().open("media/123/full")!!.size)
  }

  @Test
  fun `a key that tries to leave the root is rejected and nothing outside is touched`() {
    val outside = Files.createTempFile("outside", ".txt")
    try {
      assertFailsWith<IllegalArgumentException> { storage().save("../${outside.fileName}", byteArrayOf(1)) }
      assertFailsWith<IllegalArgumentException> { storage().save("media/../../x", byteArrayOf(1)) }
      assertFailsWith<IllegalArgumentException> { storage().open("../${outside.fileName}") }
      assertFailsWith<IllegalArgumentException> { storage().delete("../${outside.fileName}") }
      assertFailsWith<IllegalArgumentException> { storage().deleteFolder("..") }
      assertFailsWith<IllegalArgumentException> { storage().save("/etc/passwd", byteArrayOf(1)) }
      assertFailsWith<IllegalArgumentException> { storage().save("", byteArrayOf(1)) }
      assertTrue(outside.exists(), "el archivo ajeno sigue ahí")
      assertEquals(0, Files.size(outside))
    } finally {
      Files.deleteIfExists(outside)
    }
  }

  @Test
  fun `deleting an existing file answers true and a missing one false`() {
    storage().save("media/123/thumb", byteArrayOf(1))

    assertTrue(storage().delete("media/123/thumb"))
    assertFalse(storage().delete("media/123/thumb"))
    assertFalse(root.resolve("media/123").exists(), "la carpeta vacía se retira con su último archivo")
  }

  @Test
  fun `deleting a folder removes everything inside it`() {
    storage().save("media/123/thumb", byteArrayOf(1))
    storage().save("media/123/full", byteArrayOf(2))
    storage().save("media/124/thumb", byteArrayOf(3))

    storage().deleteFolder("media/123")

    assertFalse(root.resolve("media/123").exists())
    assertTrue(storage().exists("media/124/thumb"))
    storage().deleteFolder("media/999")
  }

  @Test
  fun `folders are listed with their modification time`() {
    storage().save("media/123/thumb", byteArrayOf(1))
    storage().save("media/124/thumb", byteArrayOf(1))
    val old = Instant.parse("2026-01-01T00:00:00Z")
    Files.setLastModifiedTime(root.resolve("media/123"), FileTime.from(old))

    val folders = storage().listFolders("media").associate { it.key to it.modifiedAt }

    assertEquals(setOf("media/123", "media/124"), folders.keys)
    assertEquals(old, folders["media/123"])
    assertEquals(emptyList(), storage().listFolders("nada"))
  }
}

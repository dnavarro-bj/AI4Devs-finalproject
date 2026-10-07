package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

/** Las reglas de conjunto de una galería, que no caben en un CHECK: viven en el dominio. */
class MediaGalleryTest {

  private class FakeEntry(override val mediaId: MediaAssetId = MediaAssetId.create()) : GalleryEntry {
    override var position: Int = 0
      private set
    override var isPrimary: Boolean = false
      private set

    override fun placeAt(position: Int) { this.position = position }
    override fun markPrimary() { isPrimary = true }
    override fun unmarkPrimary() { isPrimary = false }
  }

  private fun gallery(count: Int, limit: Int = 50): Pair<MediaGallery<FakeEntry>, List<FakeEntry>> {
    val gallery = MediaGallery(emptyList<FakeEntry>(), limit)
    val entries = List(count) { FakeEntry().also(gallery::add) }
    return gallery to entries
  }

  private fun MediaGallery<FakeEntry>.primaries() = entries.filter { it.isPrimary }

  @Test
  fun `the first photo is the primary and positions follow the order of arrival`() {
    val (gallery, entries) = gallery(3)

    assertTrue(entries[0].isPrimary)
    assertFalse(entries[1].isPrimary)
    assertEquals(listOf(0, 1, 2), entries.map { it.position })
    assertEquals(entries, gallery.entries)
  }

  @Test
  fun `choosing another primary unmarks the previous one before marking the new one`() {
    val (gallery, entries) = gallery(3)
    var primariesAtFlush = -1

    gallery.setPrimary(entries[2].mediaId, true) { primariesAtFlush = gallery.primaries().size }

    assertEquals(0, primariesAtFlush, "la anterior se desmarca y se vacía antes de marcar la nueva")
    assertEquals(listOf(entries[2]), gallery.primaries())
  }

  @Test
  fun `choosing the current primary changes nothing`() {
    val (gallery, entries) = gallery(2)
    var flushed = false

    gallery.setPrimary(entries[0].mediaId, true) { flushed = true }

    assertFalse(flushed)
    assertEquals(listOf(entries[0]), gallery.primaries())
  }

  @Test
  fun `unmarking the primary is rejected`() {
    val (gallery, entries) = gallery(2)

    assertFailsWith<IllegalArgumentException> { gallery.setPrimary(entries[0].mediaId, false) }
    assertEquals(listOf(entries[0]), gallery.primaries())
  }

  @Test
  fun `a photo that is not in the gallery cannot be chosen`() {
    val (gallery, _) = gallery(2)

    assertFailsWith<NoSuchElementException> { gallery.setPrimary(MediaAssetId.create(), true) }
  }

  @Test
  fun `removing the primary promotes the one that follows in the order`() {
    val (gallery, entries) = gallery(3)
    var flushed = false

    val removed = gallery.remove(entries[0].mediaId) { flushed = true }

    assertSame(entries[0], removed)
    assertTrue(flushed)
    assertEquals(listOf(entries[1]), gallery.primaries())
    assertEquals(listOf(entries[1], entries[2]), gallery.entries)
  }

  @Test
  fun `removing a primary in the middle promotes the next one`() {
    val (gallery, entries) = gallery(3)
    gallery.setPrimary(entries[1].mediaId, true)

    gallery.remove(entries[1].mediaId)

    assertEquals(listOf(entries[2]), gallery.primaries())
  }

  @Test
  fun `removing the last primary promotes the first remaining one`() {
    val (gallery, entries) = gallery(3)
    gallery.setPrimary(entries[2].mediaId, true)

    gallery.remove(entries[2].mediaId)

    assertEquals(listOf(entries[0]), gallery.primaries())
  }

  @Test
  fun `removing a photo that is not primary keeps the primary`() {
    val (gallery, entries) = gallery(3)

    gallery.remove(entries[2].mediaId)

    assertEquals(listOf(entries[0]), gallery.primaries())
  }

  @Test
  fun `removing the only photo leaves an empty gallery`() {
    val (gallery, entries) = gallery(1)

    gallery.remove(entries[0].mediaId)

    assertTrue(gallery.entries.isEmpty())
    assertNull(gallery.primaries().firstOrNull())
  }

  @Test
  fun `reordering needs the exact set of photos`() {
    val (gallery, entries) = gallery(3)
    val (a, b, c) = entries.map { it.mediaId }

    gallery.reorder(listOf(c, a, b))

    assertEquals(listOf(entries[2], entries[0], entries[1]), gallery.entries)
    assertEquals(listOf(0, 1, 2), gallery.entries.map { it.position })
    assertEquals(listOf(entries[0]), gallery.primaries(), "reordenar no cambia la portada")
  }

  @Test
  fun `a short, long or foreign order is rejected and nothing changes`() {
    val (gallery, entries) = gallery(3)
    val (a, b, c) = entries.map { it.mediaId }

    assertFailsWith<IllegalArgumentException> { gallery.reorder(listOf(a, b)) }
    assertFailsWith<IllegalArgumentException> { gallery.reorder(listOf(a, b, c, MediaAssetId.create())) }
    assertFailsWith<IllegalArgumentException> { gallery.reorder(listOf(a, b, MediaAssetId.create())) }
    assertFailsWith<IllegalArgumentException> { gallery.reorder(listOf(a, a, b)) }
    assertEquals(entries, gallery.entries)
    assertEquals(listOf(0, 1, 2), entries.map { it.position })
  }

  @Test
  fun `the gallery has a limit`() {
    val (gallery, _) = gallery(50)

    assertFailsWith<GalleryFullException> { gallery.requireRoomFor(1) }
    gallery.remove(gallery.entries.last().mediaId)
    gallery.requireRoomFor(1)
    assertFailsWith<GalleryFullException> { gallery.requireRoomFor(2) }
  }

  @Test
  fun `a new entry goes after the last position even after a removal`() {
    val (gallery, entries) = gallery(3)
    gallery.remove(entries[1].mediaId)

    val added = FakeEntry().also(gallery::add)

    assertEquals(3, added.position)
    assertFalse(added.isPrimary)
  }
}

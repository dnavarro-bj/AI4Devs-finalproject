package com.cactify.application

import com.cactify.TestImages
import com.cactify.domain.ImageVariant
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.ExifIFD0Directory
import com.drew.metadata.exif.GpsDirectory
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream
import java.time.Instant
import javax.imageio.ImageIO
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** El procesado de la imagen (ADR-018, decisión 3): decodificar, orientar, descartar el EXIF y re-codificar. */
class ImageProcessorTest {

  private val processor = ImageProcessor(MediaLimits())

  private fun size(bytes: ByteArray): Pair<Int, Int> =
    ImageIO.read(ByteArrayInputStream(bytes)).let { it.width to it.height }

  private fun ProcessedImage.sizeOf(variant: ImageVariant) = size(variants.getValue(variant))

  @Test
  fun `a jpeg yields three variants bounded by their side and never enlarged`() {
    val processed = processor.process(TestImages.jpeg(4000, 3000))

    assertEquals("image/jpeg", processed.contentType)
    assertEquals(4000 to 3000, processed.width to processed.height)
    assertEquals(320 to 240, processed.sizeOf(ImageVariant.Thumb))
    assertEquals(1280 to 960, processed.sizeOf(ImageVariant.Medium))
    assertEquals(4000 to 3000, processed.sizeOf(ImageVariant.Full))
  }

  @Test
  fun `a small image generates the three variants at its own size`() {
    val processed = processor.process(TestImages.jpeg(200, 100))

    ImageVariant.entries.forEach { assertEquals(200 to 100, processed.sizeOf(it), "variante $it") }
    assertEquals(200 to 100, processed.width to processed.height)
  }

  @Test
  fun `the full variant is bounded by the configured maximum`() {
    val limited = ImageProcessor(MediaLimits(maxFullSide = 2000, mediumSide = 1000, thumbSide = 200))

    val processed = limited.process(TestImages.jpeg(3000, 1500))

    assertEquals(2000 to 1000, processed.sizeOf(ImageVariant.Full))
    assertEquals(2000 to 1000, processed.width to processed.height, "las dimensiones guardadas son las de la variante completa")
    assertEquals(1000 to 500, processed.sizeOf(ImageVariant.Medium))
    assertEquals(200 to 100, processed.sizeOf(ImageVariant.Thumb))
  }

  @Test
  fun `the orientation is applied so the variants are already upright`() {
    val processed = processor.process(TestImages.jpeg(600, 400, orientation = 6))

    assertEquals(400 to 600, processed.width to processed.height)
    assertEquals(400 to 600, processed.sizeOf(ImageVariant.Full))
    assertEquals(213 to 320, processed.sizeOf(ImageVariant.Thumb))
  }

  @Test
  fun `every orientation lands on the right dimensions`() {
    val swapped = setOf(5, 6, 7, 8)
    (1..8).forEach { orientation ->
      val processed = processor.process(TestImages.jpeg(300, 200, orientation = orientation))
      val expected = if (orientation in swapped) 200 to 300 else 300 to 200
      assertEquals(expected, processed.width to processed.height, "orientación $orientation")
    }
  }

  @Test
  fun `no variant keeps any exif or gps`() {
    val processed = processor.process(TestImages.jpeg(800, 600, orientation = 6, takenAt = "2026:08:14 10:00:00", gps = true))

    ImageVariant.entries.forEach { variant ->
      val metadata = ImageMetadataReader.readMetadata(ByteArrayInputStream(processed.variants.getValue(variant)))
      assertNull(metadata.getFirstDirectoryOfType(GpsDirectory::class.java), "geolocalización en $variant")
      val ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory::class.java)
      assertTrue(ifd0 == null || !ifd0.containsTag(ExifIFD0Directory.TAG_ORIENTATION), "orientación en $variant")
      assertTrue(metadata.directories.none { it.name.contains("Exif", ignoreCase = true) && it.tagCount > 0 }, "EXIF en $variant")
    }
  }

  @Test
  fun `the original does carry the exif the processor removes`() {
    val metadata = ImageMetadataReader.readMetadata(ByteArrayInputStream(TestImages.jpeg(800, 600, takenAt = "2026:08:14 10:00:00", gps = true)))

    assertNotNull(metadata.getFirstDirectoryOfType(GpsDirectory::class.java), "el fixture lleva GPS: si no, la prueba anterior no prueba nada")
  }

  @Test
  fun `the capture date is read from the exif as data`() {
    val processed = processor.process(TestImages.jpeg(800, 600, takenAt = "2026:08:14 10:00:00"))

    assertEquals(Instant.parse("2026-08-14T10:00:00Z"), processed.capturedAt)
  }

  @Test
  fun `an image without exif has no capture date`() {
    assertNull(processor.process(TestImages.jpeg(100, 100)).capturedAt)
    assertNull(processor.process(TestImages.png(100, 100)).capturedAt)
  }

  @Test
  fun `a png without transparency is stored as jpeg`() {
    val processed = processor.process(TestImages.png(300, 200))

    assertEquals("image/jpeg", processed.contentType)
  }

  @Test
  fun `a png with alpha stays a png and keeps its transparency`() {
    val processed = processor.process(TestImages.png(300, 200, alpha = true))

    assertEquals("image/png", processed.contentType)
    val full = ImageIO.read(ByteArrayInputStream(processed.variants.getValue(ImageVariant.Full)))
    assertTrue(full.colorModel.hasAlpha())
    assertEquals(0, full.getRGB(250, 150) ushr 24, "la esquina transparente sigue transparente")
    assertEquals(255, full.getRGB(10, 150) ushr 24)
  }

  @Test
  fun `a webp is stored as jpeg`() {
    val processed = processor.process(TestImages.webp())

    assertEquals("image/jpeg", processed.contentType)
    assertEquals(1 to 1, processed.width to processed.height)
  }

  @Test
  fun `a corrupt file is rejected by its content`() {
    assertFailsWith<InvalidImageException> { processor.process(TestImages.corruptJpeg()) }
  }

  @Test
  fun `a text file with an image extension is rejected`() {
    val error = assertFailsWith<InvalidImageException> { processor.process(TestImages.text()) }

    assertTrue(error.message!!.contains("JPEG, PNG o WebP"))
  }

  @Test
  fun `an empty file is rejected`() {
    assertFailsWith<InvalidImageException> { processor.process(ByteArray(0)) }
  }

  @Test
  fun `a gif and a heic are rejected naming the admitted formats`() {
    listOf(TestImages.gif(), TestImages.heic()).forEach {
      val error = assertFailsWith<InvalidImageException> { processor.process(it) }
      assertTrue(error.message!!.contains("JPEG, PNG o WebP"), error.message)
    }
  }

  @Test
  fun `an image over the pixel limit is rejected before it is decoded`() {
    val error = assertFailsWith<InvalidImageException> { processor.process(TestImages.pngDeclaring(100_000, 100_000)) }

    assertTrue(error.message!!.contains("píxeles"), error.message)
  }

  @Test
  fun `a configured pixel limit is honoured`() {
    val strict = ImageProcessor(MediaLimits(maxPixels = 10_000))

    assertFailsWith<InvalidImageException> { strict.process(TestImages.jpeg(200, 200)) }
    strict.process(TestImages.jpeg(100, 100))
  }
}

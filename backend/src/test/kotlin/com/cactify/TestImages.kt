package com.cactify

import java.awt.Color
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.Base64
import java.util.zip.CRC32
import javax.imageio.ImageIO

/** Imágenes generadas en el test: ningún binario versionado. */
object TestImages {

  /** Un degradado reconocible, para que una imagen no sea un bloque de color plano. */
  private fun canvas(width: Int, height: Int, type: Int = BufferedImage.TYPE_INT_RGB): BufferedImage {
    val image = BufferedImage(width, height, type)
    val g = image.createGraphics()
    g.color = Color(30, 140, 60)
    g.fillRect(0, 0, width, height)
    g.color = Color(220, 40, 40)
    g.fillRect(0, 0, width / 2, height / 4)
    g.dispose()
    return image
  }

  private fun encode(image: BufferedImage, format: String): ByteArray {
    val out = ByteArrayOutputStream()
    check(ImageIO.write(image, format, out)) { "No hay escritor para $format" }
    return out.toByteArray()
  }

  /**
   * Un JPEG con, opcionalmente, orientación, fecha de captura (`yyyy:MM:dd HH:mm:ss`) y coordenadas
   * GPS en su EXIF.
   */
  fun jpeg(width: Int = 640, height: Int = 480, orientation: Int? = null, takenAt: String? = null, gps: Boolean = false): ByteArray {
    val plain = encode(canvas(width, height), "jpeg")
    if (orientation == null && takenAt == null && !gps) return plain
    val exif = exifSegment(orientation, takenAt, gps)
    return plain.copyOfRange(0, 2) + exif + plain.copyOfRange(2, plain.size)
  }

  fun png(width: Int = 640, height: Int = 480, alpha: Boolean = false): ByteArray {
    val image = canvas(width, height, if (alpha) BufferedImage.TYPE_INT_ARGB else BufferedImage.TYPE_INT_RGB)
    if (alpha) {
      // La esquina inferior derecha queda totalmente transparente.
      for (x in width / 2 until width) for (y in height / 2 until height) image.setRGB(x, y, 0x00000000)
    }
    return encode(image, "png")
  }

  fun gif(): ByteArray = encode(canvas(40, 30), "gif")

  /** Un WebP de 1×1 (sin escritor en el JDK ni en TwelveMonkeys): basta para probar que se decodifica. */
  fun webp(): ByteArray = Base64.getDecoder().decode("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==")

  /** Una cabecera HEIC: el tipo de contenido que el servidor no admite. */
  fun heic(): ByteArray = byteArrayOf(0, 0, 0, 24) + "ftypheic".toByteArray() + ByteArray(32)

  fun corruptJpeg(): ByteArray = jpeg(200, 100).let { it.copyOfRange(0, 120) + ByteArray(64) { 0x55 } }

  fun text(): ByteArray = "esto no es una imagen".toByteArray()

  /** Un PNG que **declara** unas dimensiones y no trae píxeles: solo la cabecera IHDR. */
  fun pngDeclaring(width: Int, height: Int): ByteArray {
    val ihdr = ByteBuffer.allocate(13).putInt(width).putInt(height).put(8).put(2).put(0).put(0).put(0).array()
    val type = "IHDR".toByteArray()
    val crc = CRC32().apply { update(type); update(ihdr) }.value.toInt()
    val chunk = ByteBuffer.allocate(4 + 4 + 13 + 4).putInt(13).put(type).put(ihdr).putInt(crc).array()
    return byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A) + chunk
  }

  // ---- EXIF a mano ----

  private fun exifSegment(orientation: Int?, takenAt: String?, gps: Boolean): ByteArray {
    val n0 = listOfNotNull(orientation, takenAt, if (gps) 1 else null).size
    val ifd0Size = 2 + 12 * n0 + 4
    val exifOffset = 8 + ifd0Size
    val gpsOffset = exifOffset + if (takenAt != null) 18 else 0
    val dataOffset = gpsOffset + if (gps) 54 else 0
    val dateOffset = dataOffset
    val latOffset = dateOffset + if (takenAt != null) 20 else 0
    val lonOffset = latOffset + if (gps) 24 else 0

    val tiff = ByteBuffer.allocate(lonOffset + if (gps) 24 else 0) // big-endian por defecto
    tiff.put('M'.code.toByte()).put('M'.code.toByte()).putShort(0x002A).putInt(8)

    // IFD0 (entradas ordenadas por etiqueta)
    tiff.putShort(n0.toShort())
    if (orientation != null) tiff.putShort(0x0112).putShort(3).putInt(1).putShort(orientation.toShort()).putShort(0)
    if (takenAt != null) tiff.putShort(0x8769.toShort()).putShort(4).putInt(1).putInt(exifOffset)
    if (gps) tiff.putShort(0x8825.toShort()).putShort(4).putInt(1).putInt(gpsOffset)
    tiff.putInt(0)

    if (takenAt != null) {
      tiff.putShort(1).putShort(0x9003.toShort()).putShort(2).putInt(20).putInt(dateOffset).putInt(0)
    }
    if (gps) {
      tiff.putShort(4)
      tiff.putShort(1).putShort(2).putInt(2).put('N'.code.toByte()).put(0).putShort(0)
      tiff.putShort(2).putShort(5).putInt(3).putInt(latOffset)
      tiff.putShort(3).putShort(2).putInt(2).put('E'.code.toByte()).put(0).putShort(0)
      tiff.putShort(4).putShort(5).putInt(3).putInt(lonOffset)
      tiff.putInt(0)
    }
    if (takenAt != null) tiff.put(takenAt.toByteArray(Charsets.US_ASCII)).put(0)
    if (gps) {
      // 40° 25' 12" N y 3° 41' 24" E: unas coordenadas reconocibles.
      listOf(40, 25, 12, 3, 41, 24).forEach { value -> tiff.putInt(value).putInt(1) }
    }
    val payload = "Exif".toByteArray() + byteArrayOf(0, 0) + tiff.array()
    return byteArrayOf(0xFF.toByte(), 0xE1.toByte()) + ByteBuffer.allocate(2).putShort((payload.size + 2).toShort()).array() + payload
  }
}

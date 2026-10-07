package com.cactify.application

import com.cactify.domain.ImageVariant
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.ExifIFD0Directory
import com.drew.metadata.exif.ExifSubIFDDirectory
import org.springframework.stereotype.Component
import java.awt.Color
import java.awt.RenderingHints
import java.awt.geom.AffineTransform
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.TimeZone
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageReader
import javax.imageio.ImageWriteParam
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** La imagen subida no se puede guardar: no es JPEG, PNG ni WebP, está corrupta o es demasiado grande. 400. */
class InvalidImageException(message: String) : RuntimeException(message)

/** Lo que el procesado deja: las tres variantes ya codificadas y los hechos de la imagen. */
class ProcessedImage(
  val contentType: String,
  /** Las dimensiones de la variante **completa**, ya orientada. */
  val width: Int,
  val height: Int,
  /** La fecha de captura del EXIF, si la había. Se lee antes de descartar el EXIF. */
  val capturedAt: Instant?,
  val variants: Map<ImageVariant, ByteArray>,
)

/**
 * Decodifica, orienta, **descarta el EXIF** y re-codifica una imagen en sus tres variantes
 * (ADR-018, decisión 3). No conoce discos ni HTTP: recibe bytes y devuelve bytes y hechos.
 *
 * El tipo se decide **por el contenido**. Antes de decodificar entera se lee solo la cabecera para
 * rechazar las imágenes que superan los píxeles máximos —la defensa contra una imagen que desborde la
 * memoria—. Lo que `ImageIO` re-codifica no lleva ningún metadato: ese es el descarte del EXIF y de
 * la geolocalización. Se procesa de uno en uno (lo llama el servicio imagen a imagen) para acotar el
 * pico de memoria.
 */
@Component
class ImageProcessor(private val limits: MediaLimits) {

  fun process(bytes: ByteArray): ProcessedImage {
    if (bytes.isEmpty()) throw InvalidImageException("El archivo está vacío. $ADMITTED")
    val stream = ImageIO.createImageInputStream(ByteArrayInputStream(bytes))
      ?: throw InvalidImageException("El archivo no es una imagen admitida. $ADMITTED")
    stream.use {
      val reader = readerFor(stream) ?: throw InvalidImageException("El archivo no es una imagen admitida. $ADMITTED")
      try {
        reader.input = stream
        val format = reader.formatName.lowercase()
        val declared = declaredSize(reader)
        if (declared.first.toLong() * declared.second > limits.maxPixels) {
          throw InvalidImageException(
            "La imagen mide ${declared.first}×${declared.second} px y supera el máximo de ${limits.maxPixels} píxeles",
          )
        }
        val exif = readExif(bytes)
        val decoded = decode(reader)
        return encode(decoded, format, exif)
      } finally {
        reader.dispose()
      }
    }
  }

  // ---- Lectura ----

  private fun readerFor(stream: javax.imageio.stream.ImageInputStream): ImageReader? {
    val readers = ImageIO.getImageReaders(stream).asSequence().toList()
    if (readers.isEmpty()) return null
    val accepted = readers.firstOrNull { it.formatName.lowercase() in FORMATS }
    if (accepted == null) {
      readers.forEach { it.dispose() }
      throw InvalidImageException("El formato ${readers.first().formatName.uppercase()} no se admite. $ADMITTED")
    }
    readers.filter { it !== accepted }.forEach { it.dispose() }
    return accepted
  }

  private fun declaredSize(reader: ImageReader): Pair<Int, Int> = try {
    reader.getWidth(0) to reader.getHeight(0)
  } catch (e: Exception) {
    throw InvalidImageException("La imagen está dañada y no se puede leer. $ADMITTED")
  }

  private fun decode(reader: ImageReader): BufferedImage {
    val raw = try {
      reader.read(0)
    } catch (e: Exception) {
      throw InvalidImageException("La imagen está dañada y no se puede leer. $ADMITTED")
    } ?: throw InvalidImageException("La imagen está dañada y no se puede leer. $ADMITTED")
    // Todo pasa a ARGB: el resto del procesado no depende del modelo de color del original.
    if (raw.type == BufferedImage.TYPE_INT_ARGB) return raw
    return BufferedImage(raw.width, raw.height, BufferedImage.TYPE_INT_ARGB).also { argb ->
      argb.createGraphics().apply {
        drawImage(raw, 0, 0, null)
        dispose()
      }
    }
  }

  private class Exif(val orientation: Int, val capturedAt: Instant?)

  /** La orientación y la fecha de captura. Cualquier fallo del lector de metadatos es «sin EXIF». */
  private fun readExif(bytes: ByteArray): Exif = try {
    val metadata = ImageMetadataReader.readMetadata(ByteArrayInputStream(bytes))
    val ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory::class.java)
    val sub = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory::class.java)
    val orientation = ifd0?.takeIf { it.containsTag(ExifIFD0Directory.TAG_ORIENTATION) }?.getInteger(ExifIFD0Directory.TAG_ORIENTATION)
    val date = sub?.getDateOriginal(TimeZone.getTimeZone("UTC")) ?: ifd0?.getDate(ExifIFD0Directory.TAG_DATETIME, TimeZone.getTimeZone("UTC"))
    Exif(orientation?.takeIf { it in 1..8 } ?: 1, date?.toInstant())
  } catch (_: Exception) {
    Exif(1, null)
  }

  // ---- Escritura ----

  private fun encode(decoded: BufferedImage, format: String, exif: Exif): ProcessedImage {
    val upright = orient(decoded, exif.orientation)
    // Solo un PNG con canal alfa se queda en PNG: un WebP, un JPEG o un PNG opaco se guardan como JPEG.
    val asPng = format == "png" && decoded.colorModel.hasAlpha() && hasTransparency(decoded)
    val contentType = if (asPng) "image/png" else "image/jpeg"

    val full = fit(upright, limits.maxFullSide)
    val variants = linkedMapOf(
      ImageVariant.Thumb to write(fit(full, limits.thumbSide), asPng),
      ImageVariant.Medium to write(fit(full, limits.mediumSide), asPng),
      ImageVariant.Full to write(full, asPng),
    )
    return ProcessedImage(contentType, full.width, full.height, exif.capturedAt, variants)
  }

  /** Un PNG con canal alfa pero todos los píxeles opacos no necesita seguir siendo PNG. */
  private fun hasTransparency(image: BufferedImage): Boolean {
    for (y in 0 until image.height) for (x in 0 until image.width) if (image.getRGB(x, y) ushr 24 != 0xFF) return true
    return false
  }

  private fun orient(image: BufferedImage, orientation: Int): BufferedImage {
    val w = image.width.toDouble()
    val h = image.height.toDouble()
    val transform = when (orientation) {
      2 -> AffineTransform(-1.0, 0.0, 0.0, 1.0, w, 0.0)
      3 -> AffineTransform(-1.0, 0.0, 0.0, -1.0, w, h)
      4 -> AffineTransform(1.0, 0.0, 0.0, -1.0, 0.0, h)
      5 -> AffineTransform(0.0, 1.0, 1.0, 0.0, 0.0, 0.0)
      6 -> AffineTransform(0.0, 1.0, -1.0, 0.0, h, 0.0)
      7 -> AffineTransform(0.0, -1.0, -1.0, 0.0, h, w)
      8 -> AffineTransform(0.0, -1.0, 1.0, 0.0, 0.0, w)
      else -> return image
    }
    val swap = orientation in 5..8
    val target = BufferedImage(if (swap) image.height else image.width, if (swap) image.width else image.height, BufferedImage.TYPE_INT_ARGB)
    target.createGraphics().apply {
      drawImage(image, transform, null)
      dispose()
    }
    return target
  }

  /** Reduce para que el lado mayor no pase de [side], sin ampliar nunca. */
  private fun fit(image: BufferedImage, side: Int): BufferedImage {
    val longest = max(image.width, image.height)
    if (longest <= side) return image
    val scale = side.toDouble() / longest
    val width = max(1, (image.width * scale).roundToInt())
    val height = max(1, (image.height * scale).roundToInt())
    return resize(image, width, height)
  }

  /** Reduce a mitades mientras sobre más del doble y termina con una pasada bicúbica: más nítido que una sola. */
  private fun resize(image: BufferedImage, width: Int, height: Int): BufferedImage {
    var current = image
    while (current.width / 2 >= width && current.height / 2 >= height) {
      current = draw(current, current.width / 2, current.height / 2)
    }
    return if (current.width == width && current.height == height) current else draw(current, width, height)
  }

  private fun draw(source: BufferedImage, width: Int, height: Int): BufferedImage {
    val target = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
    target.createGraphics().apply {
      setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
      setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
      drawImage(source, 0, 0, width, height, null)
      dispose()
    }
    return target
  }

  private fun write(image: BufferedImage, png: Boolean): ByteArray {
    val out = ByteArrayOutputStream()
    if (png) {
      check(ImageIO.write(image, "png", out)) { "No hay escritor PNG" }
      return out.toByteArray()
    }
    // JPEG no admite alfa: se pinta sobre blanco.
    val rgb = BufferedImage(image.width, image.height, BufferedImage.TYPE_INT_RGB)
    rgb.createGraphics().apply {
      color = Color.WHITE
      fillRect(0, 0, image.width, image.height)
      drawImage(image, 0, 0, null)
      dispose()
    }
    val writer = ImageIO.getImageWritersByFormatName("jpeg").next()
    try {
      val param = writer.defaultWriteParam.apply {
        compressionMode = ImageWriteParam.MODE_EXPLICIT
        compressionQuality = min(1f, limits.jpegQuality)
      }
      ImageIO.createImageOutputStream(out).use { target ->
        writer.output = target
        // Sin metadatos: ni EXIF ni geolocalización salen de aquí.
        writer.write(null, IIOImage(rgb, null, null), param)
      }
    } finally {
      writer.dispose()
    }
    return out.toByteArray()
  }

  private companion object {
    val FORMATS = setOf("jpeg", "png", "webp")
    const val ADMITTED = "Formatos admitidos: JPEG, PNG o WebP."

    init {
      // Sin caché en disco: todo ocurre en memoria. Y se registran los lectores de TwelveMonkeys aunque
      // el cargador de clases de la aplicación empaquetada no los hubiera descubierto.
      ImageIO.setUseCache(false)
      ImageIO.scanForPlugins()
    }
  }
}

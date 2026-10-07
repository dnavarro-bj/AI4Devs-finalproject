package com.cactify.infrastructure

import com.cactify.application.MediaLimits
import com.cactify.application.ports.MediaStorage
import com.cactify.infrastructure.storage.DiskMediaStorage
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.util.unit.DataSize
import java.nio.file.Path
import java.time.Duration

/**
 * Lo que `cactify.media.*` configura: dónde viven los archivos, los límites de las subidas y el
 * barrido de huérfanos. Los valores por defecto son los del producto (ADR-018).
 */
@ConfigurationProperties("cactify.media")
data class MediaProperties(
  val root: String = "./data/media",
  val maxFileSize: DataSize = DataSize.ofMegabytes(10),
  val maxFiles: Int = 10,
  val maxPerOwner: Int = 50,
  val maxPixels: Long = 50_000_000,
  val thumbSide: Int = 320,
  val mediumSide: Int = 1280,
  val maxFullSide: Int = 4096,
  val quality: Float = 0.85f,
  val orphanMinAge: Duration = Duration.ofDays(1),
  val cleanup: Cleanup = Cleanup(),
) {
  /** El barrido de huérfanos: se puede apagar y su periodicidad es configurable. */
  data class Cleanup(val enabled: Boolean = true, val cron: String = "0 0 4 * * SUN")
}

@Configuration
@EnableConfigurationProperties(MediaProperties::class)
class MediaConfiguration {

  /** Una configuración incoherente lanza aquí y **impide arrancar** (ver [MediaLimits]). */
  @Bean
  fun mediaLimits(properties: MediaProperties) = MediaLimits(
    maxFileBytes = properties.maxFileSize.toBytes(),
    maxFiles = properties.maxFiles,
    maxPerOwner = properties.maxPerOwner,
    maxPixels = properties.maxPixels,
    thumbSide = properties.thumbSide,
    mediumSide = properties.mediumSide,
    maxFullSide = properties.maxFullSide,
    jpegQuality = properties.quality,
    orphanMinAge = properties.orphanMinAge,
  )

  @Bean
  fun mediaStorage(properties: MediaProperties): MediaStorage = DiskMediaStorage(Path.of(properties.root))
}

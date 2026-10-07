package com.cactify.web.controllers

import com.cactify.application.MediaService
import org.springframework.core.io.InputStreamResource
import org.springframework.core.io.Resource
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.context.request.WebRequest
import java.time.Duration

/**
 * Sirve las variantes de las fotografías (ADR-018, decisión 5). El contenido de un identificador no
 * cambia nunca, así que la caché es larga e `immutable`; el tipo lo fija el servidor a partir de lo
 * guardado —jamás el cliente— y `nosniff` impide que el navegador lo reinterprete.
 */
@RestController
@RequestMapping("/media")
class MediaController(private val service: MediaService) {

  @GetMapping("/{id}/{variant}")
  fun serve(@PathVariable id: String, @PathVariable variant: String, request: WebRequest): ResponseEntity<Resource>? {
    val file = service.open(id, variant)
    if (request.checkNotModified(file.etag)) {
      file.content.close()
      return null
    }
    return ResponseEntity.ok()
      .contentType(MediaType.parseMediaType(file.contentType))
      .contentLength(file.size)
      .eTag(file.etag)
      .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
      .header("X-Content-Type-Options", "nosniff")
      .header(HttpHeaders.VARY, HttpHeaders.ACCEPT_ENCODING)
      .body(InputStreamResource(file.content))
  }
}

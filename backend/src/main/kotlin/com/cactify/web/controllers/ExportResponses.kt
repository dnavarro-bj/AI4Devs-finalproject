package com.cactify.web.controllers

import com.cactify.application.export.ExportFile
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

/**
 * Un archivo exportado como descarga (ADR-017): `text/csv; charset=UTF-8` y `Content-Disposition:
 * attachment` con el nombre fechado que fija el servidor. La cabecera se expone en CORS.
 */
internal fun ExportFile.asDownload(): ResponseEntity<ByteArray> =
  ResponseEntity.ok()
    .contentType(MediaType("text", "csv", Charsets.UTF_8))
    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
    .body(bytes)

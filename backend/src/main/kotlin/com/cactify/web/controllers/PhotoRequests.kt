package com.cactify.web.controllers

import com.cactify.application.PhotoPatch
import com.cactify.application.UploadedFile
import com.fasterxml.jackson.databind.JsonNode
import jakarta.validation.constraints.NotNull
import org.springframework.web.multipart.MultipartFile
import java.time.Instant
import java.time.format.DateTimeParseException

/** El cuerpo de `PUT …/photos/order`: **todos** los identificadores, en su nuevo orden. */
data class PhotoOrderRequest(
  @field:NotNull(message = "ids es obligatorio")
  val ids: List<String>? = null,
)

/** Los archivos recibidos. **El nombre del cliente no se lee**: nunca entra al sistema. */
internal fun List<MultipartFile>?.toUploads(): List<UploadedFile> = orEmpty().map { UploadedFile(it.bytes) }

/**
 * Lee el cuerpo de una corrección parcial. Ausente y `null` son cosas distintas —un campo ausente no se
 * toca y uno a `null` se borra—, así que el cuerpo se lee como árbol y no como una clase con opcionales.
 * Aquí solo se comprueba la **forma** (texto, booleano, fecha ISO); las reglas son del dominio.
 */
internal fun JsonNode.toPhotoPatch(allowed: Set<String>): PhotoPatch {
  require(isObject) { "El cuerpo debe ser un objeto JSON" }
  val present = fieldNames().asSequence().toSet()
  val unknown = present - allowed
  require(unknown.isEmpty()) { "Campos no admitidos: ${unknown.joinToString()}" }

  fun text(name: String): String? = when {
    !has(name) || get(name).isNull -> null
    get(name).isTextual -> get(name).asText()
    else -> throw IllegalArgumentException("$name debe ser un texto")
  }
  val primary = when {
    !has("primary") -> null
    get("primary").isBoolean -> get("primary").asBoolean()
    else -> throw IllegalArgumentException("primary debe ser verdadero o falso")
  }
  val capturedAt = text("capturedAt")?.let {
    try {
      Instant.parse(it)
    } catch (_: DateTimeParseException) {
      throw IllegalArgumentException("capturedAt debe ser una fecha ISO-8601 con zona, como 2026-05-01T08:00:00Z")
    }
  }
  return PhotoPatch(
    present = present,
    altText = text("altText"),
    credit = text("credit"),
    capturedAt = capturedAt,
    purpose = text("purpose"),
    eventId = text("eventId"),
    primary = primary,
  )
}

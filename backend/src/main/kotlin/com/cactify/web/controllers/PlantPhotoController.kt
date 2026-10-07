package com.cactify.web.controllers

import com.cactify.application.PlantPhotoService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.PlantPhotoResponse
import com.fasterxml.jackson.databind.JsonNode
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.time.Instant

/** La galería de un ejemplar y las fotografías que cuelgan de los eventos de su cronología. */
@RestController
@RequestMapping("/plants/{id}/photos")
class PlantPhotoController(private val service: PlantPhotoService) {

  @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
  @ResponseStatus(HttpStatus.CREATED)
  fun upload(
    @PathVariable id: String,
    @RequestParam("files", required = false) files: List<MultipartFile>?,
    @RequestParam(required = false) altText: String?,
    @RequestParam(required = false) capturedAt: Instant?,
    @RequestParam(required = false) purpose: String?,
    @RequestParam(required = false) eventId: String?,
  ): List<PlantPhotoResponse> =
    service.upload(id, files.toUploads(), PlantPhotoService.UploadCommand(altText, capturedAt, purpose, eventId))

  /** Por defecto, la evolución (captura más reciente primero); `?sort=position` da el orden manual. */
  @GetMapping
  fun list(
    @PathVariable id: String,
    @RequestParam(required = false) purpose: String?,
    @RequestParam(name = "event", required = false) eventId: String?,
    pageable: Pageable,
  ): PageResponse<PlantPhotoResponse> = service.list(id, purpose, eventId, pageable)

  /** Los literales ganan a `{mediaId}`: `order` no se confunde con un identificador. */
  @PutMapping("/order")
  fun reorder(@PathVariable id: String, @Valid @RequestBody body: PhotoOrderRequest): List<PlantPhotoResponse> =
    service.reorder(id, body.ids!!)

  @PutMapping("/{mediaId}")
  fun update(@PathVariable id: String, @PathVariable mediaId: String, @RequestBody body: JsonNode): PlantPhotoResponse =
    service.update(id, mediaId, body.toPhotoPatch(FIELDS))

  @DeleteMapping("/{mediaId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String, @PathVariable mediaId: String) = service.delete(id, mediaId)

  private companion object {
    val FIELDS = setOf("altText", "capturedAt", "purpose", "eventId", "primary")
  }
}

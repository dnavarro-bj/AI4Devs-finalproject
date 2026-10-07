package com.cactify.web.controllers

import com.cactify.application.SpeciesPhotoService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SpeciesPhotoResponse
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

/** La galería de referencia de una especie. */
@RestController
@RequestMapping("/species/{id}/photos")
class SpeciesPhotoController(private val service: SpeciesPhotoService) {

  @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
  @ResponseStatus(HttpStatus.CREATED)
  fun upload(
    @PathVariable id: String,
    @RequestParam("files", required = false) files: List<MultipartFile>?,
    @RequestParam(required = false) altText: String?,
    @RequestParam(required = false) capturedAt: Instant?,
    @RequestParam(required = false) credit: String?,
  ): List<SpeciesPhotoResponse> =
    service.upload(id, files.toUploads(), SpeciesPhotoService.UploadCommand(altText, capturedAt, credit))

  @GetMapping
  fun list(@PathVariable id: String, pageable: Pageable): PageResponse<SpeciesPhotoResponse> = service.list(id, pageable)

  /** Los literales ganan a `{mediaId}`: `order` no se confunde con un identificador. */
  @PutMapping("/order")
  fun reorder(@PathVariable id: String, @Valid @RequestBody body: PhotoOrderRequest): List<SpeciesPhotoResponse> =
    service.reorder(id, body.ids!!)

  @PutMapping("/{mediaId}")
  fun update(@PathVariable id: String, @PathVariable mediaId: String, @RequestBody body: JsonNode): SpeciesPhotoResponse =
    service.update(id, mediaId, body.toPhotoPatch(FIELDS))

  @DeleteMapping("/{mediaId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String, @PathVariable mediaId: String) = service.delete(id, mediaId)

  private companion object {
    val FIELDS = setOf("altText", "credit", "capturedAt", "primary")
  }
}

package com.cactify.web.controllers

import com.cactify.application.TagService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TagDetailResponse
import com.cactify.application.dto.TagMergeResponse
import com.cactify.application.dto.TagResponse
import com.cactify.application.dto.TagSummaryResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Pageable
import org.springframework.data.web.SortDefault
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

data class CreateTagRequest(
  @field:NotBlank(message = "el nombre es obligatorio")
  val name: String,
)

/** Renombrar una etiqueta es cambiarle el nombre, que es todo lo que tiene. */
data class RenameTagRequest(
  @field:NotBlank(message = "el nombre es obligatorio")
  val name: String,
)

/**
 * La etiqueta que absorbe a la de la ruta. Va en el cuerpo y no en la ruta porque la operación es
 * sobre el origen —es el que desaparece— y el destino es su argumento.
 */
data class MergeTagRequest(
  @field:NotBlank(message = "el tag de destino es obligatorio")
  val targetId: String,
)

@RestController
@RequestMapping("/tags")
class TagController(private val tagService: TagService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: CreateTagRequest): TagResponse =
    tagService.create(request.name)

  @GetMapping
  fun list(@SortDefault(sort = ["name"]) pageable: Pageable): PageResponse<TagSummaryResponse> =
    tagService.list(pageable)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): TagDetailResponse = tagService.findById(id)

  @PutMapping("/{id}")
  fun rename(@PathVariable id: String, @Valid @RequestBody request: RenameTagRequest): TagResponse =
    tagService.rename(id, request.name)

  @PostMapping("/{id}/merge")
  fun merge(@PathVariable id: String, @Valid @RequestBody request: MergeTagRequest): TagMergeResponse =
    tagService.merge(id, request.targetId)

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String) = tagService.delete(id)
}

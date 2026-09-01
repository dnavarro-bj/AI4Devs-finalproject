package com.cactify.web.controllers

import com.cactify.application.TagService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TagResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Pageable
import org.springframework.data.web.SortDefault
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

data class CreateTagRequest(
  @field:NotBlank(message = "el nombre es obligatorio")
  val name: String,
)

@RestController
@RequestMapping("/tags")
class TagController(private val tagService: TagService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: CreateTagRequest): TagResponse =
    tagService.create(request.name)

  @GetMapping
  fun list(@SortDefault(sort = ["name"]) pageable: Pageable): PageResponse<TagResponse> =
    tagService.list(pageable)
}

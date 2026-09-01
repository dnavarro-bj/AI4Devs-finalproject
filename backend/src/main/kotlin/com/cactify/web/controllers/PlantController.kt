package com.cactify.web.controllers

import com.cactify.application.PlantService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.PlantDetailResponse
import com.cactify.application.dto.PlantSummaryResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Pageable
import org.springframework.data.web.SortDefault
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** Los identificadores llegan como cadena y se tipan en el borde, dentro del servicio. */
data class CreatePlantRequest(
  @field:NotBlank(message = "el nickname es obligatorio")
  val nickname: String,
  @field:NotBlank(message = "la localización es obligatoria")
  val locationId: String,
  @field:NotBlank(message = "la especie es obligatoria")
  val speciesId: String,
)

/** Reemplazo del conjunto completo de tags: semántica PUT, no `PATCH` incremental. */
data class ReplacePlantTagsRequest(val tagIds: List<String> = emptyList())

@RestController
@RequestMapping("/plants")
class PlantController(private val plantService: PlantService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: CreatePlantRequest): PlantDetailResponse =
    plantService.create(request.nickname, request.locationId, request.speciesId)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): PlantDetailResponse = plantService.detail(id)

  @PutMapping("/{id}/tags")
  fun replaceTags(
    @PathVariable id: String,
    @RequestBody request: ReplacePlantTagsRequest,
  ): PlantDetailResponse = plantService.replaceTags(id, request.tagIds)

  /** `tag` es repetible y su semántica es AND: la planta debe tener todos los indicados. */
  @GetMapping
  fun list(
    @RequestParam(required = false) location: String?,
    @RequestParam(name = "tag", required = false) tags: List<String>?,
    @SortDefault(sort = ["createdAt"]) pageable: Pageable,
  ): PageResponse<PlantSummaryResponse> =
    plantService.search(location, tags.orEmpty(), pageable)
}

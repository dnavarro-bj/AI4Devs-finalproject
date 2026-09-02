package com.cactify.web.controllers

import com.cactify.application.SpeciesRequest
import com.cactify.application.SpeciesService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SpeciesCareResponse
import com.cactify.application.dto.SpeciesSummaryResponse
import jakarta.validation.Valid
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

@RestController
@RequestMapping("/species")
class SpeciesController(private val speciesService: SpeciesService) {

  /**
   * Orden estable por nombre científico: `species` no tiene columna `name`, así que no vale el
   * `@SortDefault(sort = ["name"])` de los otros catálogos. Tras `V6__` el nombre científico es
   * único, lo que lo convierte en un desempate total y hace innecesario un segundo criterio.
   * El orden va en `@SortDefault` y no en `@PageableDefault`, que fijaría también el tamaño de
   * página y taparía el `default-page-size` configurado.
   */
  @GetMapping
  fun list(@SortDefault(sort = ["scientificName"]) pageable: Pageable): PageResponse<SpeciesSummaryResponse> =
    speciesService.list(pageable)

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: SpeciesRequest): SpeciesCareResponse =
    speciesService.create(request)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): SpeciesCareResponse = speciesService.findById(id)

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String) = speciesService.delete(id)

  @PutMapping("/{id}")
  fun update(@PathVariable id: String, @Valid @RequestBody request: SpeciesRequest): SpeciesCareResponse =
    speciesService.update(id, request)
}

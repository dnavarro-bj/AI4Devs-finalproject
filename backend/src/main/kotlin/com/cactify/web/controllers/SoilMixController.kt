package com.cactify.web.controllers

import com.cactify.application.SoilMixRequest
import com.cactify.application.SoilMixService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SoilMixDetailResponse
import com.cactify.application.dto.SoilMixResponse
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
@RequestMapping("/soil-mixes")
class SoilMixController(private val soilMixService: SoilMixService) {

  /**
   * Orden estable por nombre: sin él, dos páginas consecutivas pueden repetir u omitir filas.
   * El orden va en `@SortDefault` y no en `@PageableDefault`, que fijaría también el tamaño de
   * página y taparía el `default-page-size` configurado.
   */
  @GetMapping
  fun list(@SortDefault(sort = ["name"]) pageable: Pageable): PageResponse<SoilMixResponse> =
    soilMixService.list(pageable)

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: SoilMixRequest): SoilMixResponse =
    soilMixService.create(request)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): SoilMixDetailResponse = soilMixService.findById(id)

  @PutMapping("/{id}")
  fun update(@PathVariable id: String, @Valid @RequestBody request: SoilMixRequest): SoilMixResponse =
    soilMixService.update(id, request)

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String) = soilMixService.delete(id)
}

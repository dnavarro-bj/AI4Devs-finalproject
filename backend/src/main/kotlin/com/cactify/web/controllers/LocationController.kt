package com.cactify.web.controllers

import com.cactify.application.LocationService
import com.cactify.application.dto.LocationDetailResponse
import com.cactify.application.dto.LocationResponse
import com.cactify.application.dto.LocationSummaryResponse
import com.cactify.application.dto.PageResponse
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

/** Cuerpo de la petición: es la forma del mensaje HTTP, así que vive en `web`. */
data class CreateLocationRequest(
  @field:NotBlank(message = "el nombre es obligatorio")
  val name: String,
)

/**
 * Corregir una localización es cambiarle el nombre, que es todo lo que tiene: el cuerpo coincide
 * con el del alta, pero se declara aparte porque la jerarquía (T-18) los separará.
 */
data class RenameLocationRequest(
  @field:NotBlank(message = "el nombre es obligatorio")
  val name: String,
)

@RestController
@RequestMapping("/locations")
class LocationController(private val locationService: LocationService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: CreateLocationRequest): LocationResponse =
    locationService.create(request.name)

  /**
   * Orden estable por nombre: sin él, dos páginas consecutivas pueden repetir u omitir filas.
   * El orden va en `@SortDefault` y no en `@PageableDefault` porque este último fija también el
   * tamaño de página (10) y taparía el `default-page-size` configurado.
   */
  @GetMapping
  fun list(@SortDefault(sort = ["name"]) pageable: Pageable): PageResponse<LocationSummaryResponse> =
    locationService.list(pageable)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): LocationDetailResponse = locationService.findById(id)

  @PutMapping("/{id}")
  fun rename(@PathVariable id: String, @Valid @RequestBody request: RenameLocationRequest): LocationResponse =
    locationService.rename(id, request.name)

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String) = locationService.delete(id)
}

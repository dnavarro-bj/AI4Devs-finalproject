package com.cactify.web.controllers

import com.cactify.application.LocationService
import com.cactify.application.PlantMovementService
import com.cactify.application.dto.LocationDetailResponse
import com.cactify.application.dto.LocationSummaryResponse
import com.cactify.application.dto.MoveResultResponse
import com.cactify.application.dto.MovementResponse
import com.cactify.application.dto.PageResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.SortDefault
import org.springframework.http.HttpStatus
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

/**
 * Cuerpo del alta y de la edición: la forma del mensaje HTTP, así que vive en `web`. La edición es un
 * **reemplazo completo**: lo que no se envíe queda ausente, y no enviar `parentId` la hace raíz.
 */
data class LocationRequest(
  @field:NotBlank(message = "el nombre es obligatorio")
  val name: String,
  @field:NotBlank(message = "el código es obligatorio")
  val code: String,
  val parentId: String? = null,
  val description: String? = null,
  val locationType: String? = null,
  val capacity: Int? = null,
  val operationalNotes: String? = null,
  val environment: String? = null,
  val sunExposure: String? = null,
) {
  fun toInput() = LocationService.LocationInput(
    name, code, parentId, description, locationType, capacity, operationalNotes, environment, sunExposure,
  )
}

/** Los ejemplares que se mueven al destino de la ruta. */
data class MovePlantsRequest(val plantIds: List<String> = emptyList())

@RestController
@RequestMapping("/locations")
class LocationController(
  private val locationService: LocationService,
  private val movementService: PlantMovementService,
) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: LocationRequest): LocationDetailResponse =
    locationService.create(request.toInput())

  /**
   * Orden estable por nombre: sin él, dos páginas consecutivas pueden repetir u omitir filas.
   * El orden va en `@SortDefault` y no en `@PageableDefault` porque este último fija también el
   * tamaño de página (10) y taparía el `default-page-size` configurado.
   */
  @GetMapping
  fun list(
    /** Solo los hijos directos de esta localización. */
    @RequestParam(required = false) parentId: String?,
    /** Solo las localizaciones sin padre. */
    @RequestParam(required = false, defaultValue = "false") root: Boolean,
    /** Coincidencia parcial sobre el nombre y el código, sin distinguir mayúsculas. */
    @RequestParam(name = "q", required = false) text: String?,
    @SortDefault(sort = ["name"]) pageable: Pageable,
  ): PageResponse<LocationSummaryResponse> = locationService.list(pageable, parentId, root, text)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): LocationDetailResponse = locationService.findById(id)

  @PutMapping("/{id}")
  fun update(@PathVariable id: String, @Valid @RequestBody request: LocationRequest): LocationDetailResponse =
    locationService.update(id, request.toInput())

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String) = locationService.delete(id)

  /** Mueve el lote **a esta localización**, atómicamente. */
  @PostMapping("/{id}/movements")
  fun move(@PathVariable id: String, @RequestBody request: MovePlantsRequest): MoveResultResponse =
    movementService.move(id, request.plantIds)

  /** Lo que ha recibido y cedido, del más reciente al más antiguo; `id` desempata los de un mismo instante. */
  @GetMapping("/{id}/movements")
  fun movements(
    @PathVariable id: String,
    @SortDefault.SortDefaults(
      SortDefault(sort = ["movedAt", "id.id"], direction = Sort.Direction.DESC),
    ) pageable: Pageable,
  ): PageResponse<MovementResponse> = movementService.historyOfLocation(id, pageable)
}

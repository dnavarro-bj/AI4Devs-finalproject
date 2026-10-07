package com.cactify.web.controllers

import com.cactify.application.PlantMovementService
import com.cactify.application.PlantCriteria
import com.cactify.application.PlantService
import com.cactify.application.dto.MovementResponse
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.PlantDetailResponse
import com.cactify.application.dto.PlantStatusChangeResponse
import com.cactify.application.dto.PlantSummaryResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
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
import java.time.LocalDate

/** Los identificadores llegan como cadena y se tipan en el borde, dentro del servicio. */
data class CreatePlantRequest(
  @field:NotBlank(message = "el nickname es obligatorio")
  val nickname: String,
  @field:NotBlank(message = "la localización es obligatoria")
  val locationId: String,
  @field:NotBlank(message = "la especie es obligatoria")
  val speciesId: String,
  /** Solo en el alta, y solo un estado en curso: después cambia por su propia operación. */
  val status: String? = null,
  val description: String? = null,
  val germinationYear: Int? = null,
  val germinationMonth: Int? = null,
  val acquiredOn: LocalDate? = null,
  val origin: String? = null,
  val originNote: String? = null,
  /** Lo que el ejemplar sobrescribe de la pauta de su especie; ausente = hereda todo. */
  val careOverrides: PlantService.CareOverridesInput? = null,
)

/** El cuerpo del cambio de estado: el estado nuevo y, opcionalmente, el motivo. */
data class ChangePlantStatusRequest(
  @field:NotBlank(message = "el estado es obligatorio")
  val status: String,
  val reason: String? = null,
)

/** Reemplazo completo de lo editable: no es un parche, y los tags tienen su propio endpoint. */
data class UpdatePlantRequest(
  @field:NotBlank(message = "el nickname es obligatorio")
  val nickname: String,
  @field:NotBlank(message = "la localización es obligatoria")
  val locationId: String,
  @field:NotBlank(message = "la especie es obligatoria")
  val speciesId: String,
  val description: String? = null,
  val germinationYear: Int? = null,
  val germinationMonth: Int? = null,
  val acquiredOn: LocalDate? = null,
  val origin: String? = null,
  val originNote: String? = null,
  /** Reemplazo completo: lo que no se envíe vuelve a heredarse, y no enviarlo quita todos los propios. */
  val careOverrides: PlantService.CareOverridesInput? = null,
)

/** Reemplazo del conjunto completo de tags: semántica PUT, no `PATCH` incremental. */
data class ReplacePlantTagsRequest(val tagIds: List<String> = emptyList())

@RestController
@RequestMapping("/plants")
class PlantController(
  private val plantService: PlantService,
  private val movementService: PlantMovementService,
) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@Valid @RequestBody request: CreatePlantRequest): PlantDetailResponse =
    plantService.create(
      request.nickname,
      request.locationId,
      request.speciesId,
      PlantService.Profile(
        request.description, request.germinationYear, request.germinationMonth,
        request.acquiredOn, request.origin, request.originNote, request.careOverrides,
      ),
      request.status,
    )

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): PlantDetailResponse = plantService.detail(id)

  @PutMapping("/{id}")
  fun update(
    @PathVariable id: String,
    @Valid @RequestBody request: UpdatePlantRequest,
  ): PlantDetailResponse = plantService.update(
    id,
    request.nickname,
    request.locationId,
    request.speciesId,
    PlantService.Profile(
      request.description, request.germinationYear, request.germinationMonth,
      request.acquiredOn, request.origin, request.originNote, request.careOverrides,
    ),
  )

  /** El estado tiene su propia operación porque un cambio de estado deja rastro y la edición no. */
  @PutMapping("/{id}/status")
  fun changeStatus(
    @PathVariable id: String,
    @Valid @RequestBody request: ChangePlantStatusRequest,
  ): PlantDetailResponse = plantService.changeStatus(id, request.status, request.reason)

  /** El historial de cambios de estado, del más reciente al más antiguo; `id` desempata los de un mismo instante. */
  @GetMapping("/{id}/status-changes")
  fun statusChanges(
    @PathVariable id: String,
    @SortDefault.SortDefaults(
      SortDefault(sort = ["occurredAt", "id.id"], direction = Sort.Direction.DESC),
    ) pageable: Pageable,
  ): PageResponse<PlantStatusChangeResponse> = plantService.statusChanges(id, pageable)

  /** Dónde ha estado el ejemplar, del movimiento más reciente al más antiguo; `id` desempata los de un mismo instante. */
  @GetMapping("/{id}/movements")
  fun movements(
    @PathVariable id: String,
    @SortDefault.SortDefaults(
      SortDefault(sort = ["movedAt", "id.id"], direction = Sort.Direction.DESC),
    ) pageable: Pageable,
  ): PageResponse<MovementResponse> = movementService.historyOfPlant(id, pageable)

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
    /** Coincidencia parcial sobre el código de inventario, sin distinguir mayúsculas. */
    @RequestParam(required = false) code: String?,
    /** Repetible: los estados que se quieren. Sin él, solo lo que está en curso. */
    @RequestParam(name = "status", required = false) statuses: List<String>?,
    /** Con `location`, añade las plantas de todas sus sublocalizaciones. */
    @RequestParam(required = false, defaultValue = "false") includeDescendants: Boolean,
    /** Texto libre sobre código, apodo y nombres de la especie: parcial, sin distinguir mayúsculas. */
    @RequestParam(name = "q", required = false) text: String?,
    /** Repetible: los ejemplares de cualquiera de esas especies. */
    @RequestParam(name = "species", required = false) speciesIds: List<String>?,
    /** Repetibles: la exposición y el entorno **de la especie** del ejemplar. */
    @RequestParam(name = "exposure", required = false) exposures: List<String>?,
    @RequestParam(name = "environment", required = false) environments: List<String>?,
    @SortDefault(sort = ["createdAt"]) pageable: Pageable,
  ): PageResponse<PlantSummaryResponse> =
    plantService.search(
      PlantCriteria(
        location, tags.orEmpty(), code, statuses.orEmpty(), includeDescendants,
        text, speciesIds.orEmpty(), exposures.orEmpty(), environments.orEmpty(),
      ),
      pageable,
    )
}

package com.cactify.web.controllers

import com.cactify.application.PlantEventService
import com.cactify.application.dto.TimelineEntryResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.time.LocalDate

/**
 * La fecha de los eventos no lleva anotación: que no sea futura depende del reloj único y es regla
 * del dominio. Aquí solo se comprueba la forma (ADR-011).
 */
data class CommentRequest(
  @field:NotBlank(message = "el texto es obligatorio")
  val text: String? = null,
  val occurredAt: Instant? = null,
)

data class InterventionRequest(
  @field:NotBlank(message = "el tipo es obligatorio")
  val type: String? = null,
  val occurredAt: Instant? = null,
  val product: String? = null,
  val potSize: String? = null,
  val soilMixId: String? = null,
  val notes: String? = null,
)

data class BloomRequest(
  @field:NotNull(message = "la fecha de inicio es obligatoria")
  val startedOn: LocalDate? = null,
  val endedOn: LocalDate? = null,
  @field:NotBlank(message = "el estado es obligatorio")
  val status: String? = null,
  @field:Min(0, message = "el número de flores no puede ser negativo")
  val flowerCount: Int? = null,
  val notes: String? = null,
)

@RestController
@RequestMapping("/plants/{id}")
class PlantEventController(private val service: PlantEventService) {

  @PostMapping("/comments")
  @ResponseStatus(HttpStatus.CREATED)
  fun addComment(@PathVariable id: String, @Valid @RequestBody body: CommentRequest): TimelineEntryResponse =
    service.addComment(id, PlantEventService.CommentCommand(body.text!!, body.occurredAt))

  @PutMapping("/comments/{commentId}")
  fun editComment(
    @PathVariable id: String,
    @PathVariable commentId: String,
    @Valid @RequestBody body: CommentRequest,
  ): TimelineEntryResponse = service.editComment(id, commentId, body.text!!)

  @DeleteMapping("/comments/{commentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun removeComment(@PathVariable id: String, @PathVariable commentId: String) = service.removeComment(id, commentId)

  @PostMapping("/interventions")
  @ResponseStatus(HttpStatus.CREATED)
  fun addIntervention(@PathVariable id: String, @Valid @RequestBody body: InterventionRequest): TimelineEntryResponse =
    service.addIntervention(id, body.toCommand())

  @PutMapping("/interventions/{interventionId}")
  fun replaceIntervention(
    @PathVariable id: String,
    @PathVariable interventionId: String,
    @Valid @RequestBody body: InterventionRequest,
  ): TimelineEntryResponse = service.replaceIntervention(id, interventionId, body.toCommand())

  @DeleteMapping("/interventions/{interventionId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun removeIntervention(@PathVariable id: String, @PathVariable interventionId: String) =
    service.removeIntervention(id, interventionId)

  @PostMapping("/blooms")
  @ResponseStatus(HttpStatus.CREATED)
  fun addBloom(@PathVariable id: String, @Valid @RequestBody body: BloomRequest): TimelineEntryResponse =
    service.addBloom(id, body.toCommand())

  @PutMapping("/blooms/{bloomId}")
  fun replaceBloom(
    @PathVariable id: String,
    @PathVariable bloomId: String,
    @Valid @RequestBody body: BloomRequest,
  ): TimelineEntryResponse = service.replaceBloom(id, bloomId, body.toCommand())

  @DeleteMapping("/blooms/{bloomId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun removeBloom(@PathVariable id: String, @PathVariable bloomId: String) = service.removeBloom(id, bloomId)

  private fun InterventionRequest.toCommand() =
    PlantEventService.InterventionCommand(type!!, occurredAt, product, potSize, soilMixId, notes)

  private fun BloomRequest.toCommand() =
    PlantEventService.BloomCommand(startedOn!!, endedOn, status!!, flowerCount, notes)
}

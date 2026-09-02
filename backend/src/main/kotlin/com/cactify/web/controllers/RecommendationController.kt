package com.cactify.web.controllers

import com.cactify.application.RecommendationService
import com.cactify.application.dto.RecommendationResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * El ticket describe un único `GET` que genera si no existe. Se parte en dos: un `GET` que llama a
 * un proveedor de pago y escribe una fila rompe la semántica del verbo, y encadenarlo por fila
 * desde el historial costaría una llamada por lectura.
 */
@RestController
@RequestMapping("/plants/{plantId}/care-records/{careRecordId}/recommendation")
class RecommendationController(private val recommendationService: RecommendationService) {

  /** Idempotente: si la lectura ya tiene recomendación, la devuelve sin consultar al proveedor. */
  @PostMapping
  fun generate(
    @PathVariable plantId: String,
    @PathVariable careRecordId: String,
  ): ResponseEntity<RecommendationResponse> {
    val generated = recommendationService.generate(plantId, careRecordId)
    val status = if (generated.alreadyExisted) HttpStatus.OK else HttpStatus.CREATED
    return ResponseEntity.status(status).body(generated.recommendation)
  }

  /** Solo lectura: nunca genera. */
  @GetMapping
  fun find(
    @PathVariable plantId: String,
    @PathVariable careRecordId: String,
  ): RecommendationResponse = recommendationService.find(plantId, careRecordId)
}

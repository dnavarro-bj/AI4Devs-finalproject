package com.cactify.web.controllers

import com.cactify.application.AlertCommentRequest
import com.cactify.application.AlertCriteria
import com.cactify.application.AlertService
import com.cactify.application.CreateAlertRequest
import com.cactify.application.dto.AlertResponse
import com.cactify.application.dto.PageResponse
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.SortDefault
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/alerts")
class AlertController(private val alertService: AlertService) {

  /**
   * Los filtros se combinan con `AND`; `status` y `severity` son repetibles (cualquiera de los
   * valores). Sin orden pedido, el de la bandeja: severidad descendente y, dentro, la última detección
   * más reciente primero. Sin `status`, todas: la pantalla pide las abiertas.
   */
  @GetMapping
  fun list(
    @RequestParam(name = "status", required = false) statuses: List<String>?,
    @RequestParam(name = "severity", required = false) severities: List<String>?,
    @RequestParam(required = false) source: String?,
    @RequestParam(required = false) category: String?,
    @RequestParam(required = false) plant: String?,
    /** Alertas de esa localización o de ejemplares que están en ella; con `includeDescendants`, también su subárbol. */
    @RequestParam(required = false) location: String?,
    @RequestParam(required = false, defaultValue = "false") includeDescendants: Boolean,
    @SortDefault(sort = ["severity", "lastDetected"], direction = Sort.Direction.DESC) pageable: Pageable,
  ): PageResponse<AlertResponse> = alertService.search(
    AlertCriteria(
      statuses = statuses.orEmpty(),
      severities = severities.orEmpty(),
      source = source,
      category = category,
      plant = plant,
      location = location,
      includeDescendants = includeDescendants,
    ),
    pageable,
  )

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): AlertResponse = alertService.findById(id)

  /** Una incidencia anotada a mano sobre una planta o una localización. */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@RequestBody request: CreateAlertRequest): AlertResponse = alertService.create(request)

  @PostMapping("/{id}/review")
  fun review(@PathVariable id: String, @RequestBody(required = false) request: AlertCommentRequest?): AlertResponse =
    alertService.review(id, request)

  @PostMapping("/{id}/resolve")
  fun resolve(@PathVariable id: String, @RequestBody(required = false) request: AlertCommentRequest?): AlertResponse =
    alertService.resolve(id, request)

  @PostMapping("/{id}/dismiss")
  fun dismiss(@PathVariable id: String, @RequestBody(required = false) request: AlertCommentRequest?): AlertResponse =
    alertService.dismiss(id, request)
}

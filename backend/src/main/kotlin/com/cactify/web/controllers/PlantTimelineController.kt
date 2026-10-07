package com.cactify.web.controllers

import com.cactify.application.PlantTimelineService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TimelineEntryResponse
import com.cactify.domain.TimelineType
import org.springframework.data.domain.Pageable
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/plants/{id}/timeline")
class PlantTimelineController(private val service: PlantTimelineService) {

  /**
   * Del más reciente al más antiguo; el orden lo fija el servicio, no el cliente. `?type=` se repite
   * para pedir varios tipos y se aplica antes de paginar; un tipo desconocido es `400`.
   */
  @GetMapping
  fun timeline(
    @PathVariable id: String,
    @RequestParam(name = "type", required = false) type: List<String>?,
    pageable: Pageable,
  ): PageResponse<TimelineEntryResponse> =
    service.timeline(id, type.orEmpty().map { TimelineType(it) }.toSet(), pageable)
}

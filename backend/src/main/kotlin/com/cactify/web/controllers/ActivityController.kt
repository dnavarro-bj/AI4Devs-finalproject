package com.cactify.web.controllers

import com.cactify.application.ActivityService
import com.cactify.application.dto.ActivityEntryResponse
import com.cactify.application.dto.PageResponse
import org.springframework.data.domain.Pageable
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/activity")
class ActivityController(private val service: ActivityService) {

  /** Lo que se hizo, del más reciente al más antiguo; el orden lo fija el servicio, no el cliente. */
  @GetMapping
  fun recent(pageable: Pageable): PageResponse<ActivityEntryResponse> = service.recent(pageable)
}

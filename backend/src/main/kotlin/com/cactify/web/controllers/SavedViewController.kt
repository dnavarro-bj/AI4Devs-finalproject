package com.cactify.web.controllers

import com.cactify.application.SavedViewRequest
import com.cactify.application.SavedViewService
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SavedViewResponse
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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/saved-views")
class SavedViewController(private val savedViewService: SavedViewService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(@RequestBody request: SavedViewRequest): SavedViewResponse = savedViewService.create(request)

  /** `scope` filtra por ámbito (`plants` o `species`); sin él, todas. */
  @GetMapping
  fun list(
    @RequestParam(required = false) scope: String?,
    @SortDefault(sort = ["name"]) pageable: Pageable,
  ): PageResponse<SavedViewResponse> = savedViewService.list(scope, pageable)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): SavedViewResponse = savedViewService.findById(id)

  @PutMapping("/{id}")
  fun update(@PathVariable id: String, @RequestBody request: SavedViewRequest): SavedViewResponse =
    savedViewService.update(id, request)

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun delete(@PathVariable id: String) = savedViewService.delete(id)
}

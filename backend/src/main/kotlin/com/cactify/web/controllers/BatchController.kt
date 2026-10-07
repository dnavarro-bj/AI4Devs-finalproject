package com.cactify.web.controllers

import com.cactify.application.BatchPreviewRequest
import com.cactify.application.BatchRequest
import com.cactify.application.BatchService
import com.cactify.application.dto.BatchPreviewResponse
import com.cactify.application.dto.BatchResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * El trabajo por lote: aplicar **una** acción a muchas plantas a la vez. `preview` dice antes de
 * guardar cuántas plantas afectaría; `POST /batches` lo aplica en una transacción.
 */
@RestController
@RequestMapping("/batches")
class BatchController(private val batchService: BatchService) {

  @PostMapping("/preview")
  fun preview(@RequestBody request: BatchPreviewRequest): BatchPreviewResponse = batchService.preview(request)

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun apply(@RequestBody request: BatchRequest): BatchResponse = batchService.apply(request)

  @GetMapping("/{id}")
  fun detail(@PathVariable id: String): BatchResponse = batchService.findById(id)
}

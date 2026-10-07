package com.cactify.application.dto

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

/**
 * Una vista guardada. `columns` solo viaja en las del inventario que las guardan, y `matchCount`
 * solo en las del ámbito `species` (los grupos): cuántas especies cumplen **hoy** su regla.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class SavedViewResponse(
  val id: String,
  val scope: String,
  val name: String,
  val query: String,
  val columns: List<String>?,
  val matchCount: Long?,
  val createdAt: Instant?,
  val updatedAt: Instant?,
)

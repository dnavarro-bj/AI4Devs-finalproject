package com.cactify.application.dto

import org.springframework.data.domain.Page

/**
 * Envelope de los listados del API (ADR-009). Se define propio en lugar de serializar el `Page`
 * de Spring: la serialización de `PageImpl` no tiene contrato estable entre versiones.
 */
data class PageResponse<T>(
  val content: List<T>,
  val totalElements: Long,
  val totalPages: Int,
  val pageNumber: Int,
  val pageSize: Int,
) {
  companion object {
    fun <E, T> of(page: Page<E>, map: (E) -> T): PageResponse<T> =
      PageResponse(
        content = page.content.map(map),
        totalElements = page.totalElements,
        totalPages = page.totalPages,
        pageNumber = page.number,
        pageSize = page.size,
      )
  }
}

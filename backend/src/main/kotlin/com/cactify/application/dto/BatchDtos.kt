package com.cactify.application.dto

import java.time.Instant

/** Cuántas plantas afectaría un lote. */
data class BatchPreviewResponse(val count: Int)

/**
 * Una operación por lote, tal como se hizo: qué se registró (`lectura`, `intervencion` o `comentario`),
 * cómo se eligió el alcance (`plantas`, `localizacion` o `consulta`), a cuántas plantas **de verdad** y
 * cuándo.
 */
data class BatchResponse(
  val id: String,
  val action: String,
  val scopeKind: String,
  val plantCount: Int,
  val occurredAt: Instant,
  val createdAt: Instant,
)

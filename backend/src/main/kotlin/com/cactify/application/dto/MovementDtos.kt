package com.cactify.application.dto

import java.time.Instant

/** Una localización vista desde un movimiento: identificador y nombre. */
data class MovementLocationResponse(val id: String, val name: String)

/** Un movimiento del historial, con los nombres ya resueltos. */
data class MovementResponse(
  val id: String,
  val plantId: String,
  val plantCode: String,
  val from: MovementLocationResponse,
  val to: MovementLocationResponse,
  val movedAt: Instant,
)

/** Resultado de un lote: cuántos ejemplares cambiaron de sitio y cuántos ya estaban en el destino. */
data class MoveResultResponse(val moved: Int, val unchanged: Int)

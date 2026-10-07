package com.cactify.application

import java.time.Instant

/**
 * Una corrección parcial de una fotografía. Lo que **no** está en [present] no se toca; lo que está,
 * aunque sea `null`, se aplica: `capturedAt: null` borra la fecha y `eventId: null` descuelga la foto.
 * Por eso no basta con campos opcionales: ausente y nulo significan cosas distintas.
 */
class PhotoPatch(
  val present: Set<String>,
  val altText: String? = null,
  val credit: String? = null,
  val capturedAt: Instant? = null,
  val purpose: String? = null,
  val eventId: String? = null,
  val primary: Boolean? = null,
) {
  fun has(field: String) = field in present
}

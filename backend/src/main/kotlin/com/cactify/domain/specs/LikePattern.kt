package com.cactify.domain.specs

/**
 * El texto de una búsqueda por coincidencia parcial. Es **literal**: los comodines de `LIKE`
 * (`%` y `_`) y el propio carácter de escape se neutralizan, porque nadie busca un comodín y un
 * texto pegado con uno de ellos devolvería resultados que nadie sabría explicar.
 *
 * Quien lo use debe declarar [ESCAPE] como carácter de escape en la consulta.
 */
object LikePattern {
  const val ESCAPE = '\\'

  fun escape(text: String): String =
    text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

  /** El patrón de «contiene este texto». */
  fun contains(text: String): String = "%${escape(text)}%"
}

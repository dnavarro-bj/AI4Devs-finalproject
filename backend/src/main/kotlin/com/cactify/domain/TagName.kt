package com.cactify.domain

/**
 * Normalización del nombre de un tag. La forma normalizada es exactamente la que compara el
 * índice único `tag_name_normalized_unique ON tag (lower(trim(name)))` (ADR-002): el camino
 * feliz comprueba el duplicado antes de insertar, y la base de datos queda como última red.
 */
object TagName {
  /** Nombre tal y como se guarda y se muestra: sin espacios sobrantes, con su capitalización. */
  fun display(name: String): String = name.trim()

  /** Forma con la que se comparan dos nombres: sin espacios y sin distinguir mayúsculas. */
  fun normalize(name: String): String = name.trim().lowercase()
}

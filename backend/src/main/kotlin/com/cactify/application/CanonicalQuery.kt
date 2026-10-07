package com.cactify.application

import java.net.URLDecoder
import java.nio.charset.StandardCharsets

/**
 * La forma canónica de una consulta de listado, que es lo que se guarda en una vista y lo que el
 * frontend compara para saber cuál está aplicada. **Hay dos implementaciones de la misma regla**
 * —esta y `canonicalQuery` del frontend— y la defienden los mismos vectores de prueba
 * (`contracts/canonical-query.vectors.json`).
 *
 * La regla: pares ordenados por clave y, dentro de una clave, por valor (orden de unidades UTF-16 de
 * la cadena decodificada); `sort` conserva su orden, que es significativo; sin `page`, `size`,
 * valores en blanco ni pares repetidos; sin `?` inicial; valores codificados con todo menos
 * `A-Z a-z 0-9 - . _ ~ ,` en `%XX` mayúsculas sobre UTF-8. Un `+` entrante es un espacio.
 */
object CanonicalQuery {

  /** La paginación no forma parte de una vista. */
  private val DROPPED = setOf("page", "size")

  private const val SORT = "sort"

  /** Los pares clave-valor ya decodificados, en el orden en que llegan y sin descartar nada. */
  fun parse(raw: String?): List<Pair<String, String>> =
    raw.orEmpty().removePrefix("?").split("&")
      .filter { it.isNotEmpty() }
      .map { segment ->
        val at = segment.indexOf('=')
        val key = if (at < 0) segment else segment.substring(0, at)
        val value = if (at < 0) "" else segment.substring(at + 1)
        decode(key) to decode(value)
      }

  /** Las claves y valores de la consulta canónica, agrupados por clave, para construir los criterios. */
  fun parameters(raw: String?): Map<String, List<String>> =
    pairs(raw).groupBy({ it.first }, { it.second })

  fun of(raw: String?): String =
    pairs(raw).joinToString("&") { (key, value) -> "${encode(key)}=${encode(value)}" }

  private fun pairs(raw: String?): List<Pair<String, String>> {
    val kept = parse(raw).filter { (key, value) -> key !in DROPPED && key.isNotEmpty() && value.isNotBlank() }
    val (sorts, filters) = kept.partition { it.first == SORT }
    val ordered = filters.distinct().sortedWith(compareBy<Pair<String, String>> { it.first }.thenBy { it.second })
    // `sort` ocupa el lugar que le corresponde por su clave, con sus valores en el orden original.
    val sortAt = ordered.indexOfFirst { it.first > SORT }.let { if (it < 0) ordered.size else it }
    return ordered.take(sortAt) + sorts + ordered.drop(sortAt)
  }

  private fun decode(text: String): String =
    try {
      URLDecoder.decode(text, StandardCharsets.UTF_8)
    } catch (ex: IllegalArgumentException) {
      throw IllegalArgumentException("La consulta tiene una codificación inválida: '$text'")
    }

  private fun encode(text: String): String {
    val out = StringBuilder()
    for (byte in text.toByteArray(StandardCharsets.UTF_8)) {
      val c = byte.toInt() and 0xFF
      val safe = (c in 'A'.code..'Z'.code) || (c in 'a'.code..'z'.code) || (c in '0'.code..'9'.code) ||
        c == '-'.code || c == '.'.code || c == '_'.code || c == '~'.code || c == ','.code
      if (safe) out.append(c.toChar()) else out.append('%').append("%02X".format(c))
    }
    return out.toString()
  }
}

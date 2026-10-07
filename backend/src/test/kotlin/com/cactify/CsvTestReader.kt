package com.cactify

/**
 * Un lector RFC 4180 mínimo para los tests: comprueba que lo que se exporta se puede **leer de
 * vuelta** con las mismas filas y columnas, que es lo que importa de un CSV.
 */
object CsvTestReader {

  private const val BOM = '﻿'

  /** Las filas, cabecera incluida, de un documento en bytes (con o sin marca de orden de bytes). */
  fun read(bytes: ByteArray): List<List<String>> = parse(String(bytes, Charsets.UTF_8).removePrefix(BOM.toString()))

  fun parse(text: String): List<List<String>> {
    val rows = mutableListOf<List<String>>()
    var row = mutableListOf<String>()
    val cell = StringBuilder()
    var quoted = false
    var i = 0
    while (i < text.length) {
      val c = text[i]
      when {
        quoted && c == '"' && text.getOrNull(i + 1) == '"' -> { cell.append('"'); i++ }
        quoted && c == '"' -> quoted = false
        quoted -> cell.append(c)
        c == '"' -> quoted = true
        c == ',' -> { row.add(cell.toString()); cell.clear() }
        c == '\r' && text.getOrNull(i + 1) == '\n' -> { row.add(cell.toString()); cell.clear(); rows.add(row); row = mutableListOf(); i++ }
        else -> cell.append(c)
      }
      i++
    }
    return rows
  }
}

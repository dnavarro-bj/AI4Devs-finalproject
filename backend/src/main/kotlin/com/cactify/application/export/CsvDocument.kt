package com.cactify.application.export

/**
 * Un documento CSV (ADR-017): RFC 4180 —separador `,`, fin de línea CRLF, entrecomillado si la celda
 * lleva coma, comilla, CR o LF y comillas dobladas— precedido de la marca de orden de bytes UTF-8,
 * que Excel necesita para leer bien los acentos.
 *
 * **Un `String` es texto y todo lo demás es un valor generado por el sistema.** Es el único criterio
 * de la API y es lo que decide la neutralización de fórmulas: una celda de texto cuyo primer carácter
 * sea `=`, `+`, `-`, `@`, tabulador o retorno de carro lleva un apóstrofo delante, para que una hoja
 * de cálculo no la evalúe. Los números y las fechas no se tocan: una temperatura de `-5` sigue siendo
 * `-5`. `null` es una celda vacía.
 */
class CsvDocument(private val header: List<String>) {

  private val rows = mutableListOf<List<Any?>>()

  val rowCount: Int get() = rows.size

  fun row(cells: List<Any?>) {
    require(cells.size == header.size) { "La fila tiene ${cells.size} celdas y la cabecera ${header.size}" }
    rows.add(cells)
  }

  fun toText(): String = buildString {
    appendLine(header)
    rows.forEach { appendLine(it) }
  }

  fun toBytes(): ByteArray = BOM + toText().toByteArray(Charsets.UTF_8)

  private fun StringBuilder.appendLine(cells: List<Any?>) {
    cells.forEachIndexed { index, cell ->
      if (index > 0) append(',')
      append(escape(cell))
    }
    append("\r\n")
  }

  private fun escape(cell: Any?): String {
    val text = when (cell) {
      null -> return ""
      is String -> neutralized(cell)
      else -> cell.toString()
    }
    val needsQuotes = text.any { it == ',' || it == '"' || it == '\r' || it == '\n' }
    return if (needsQuotes) "\"" + text.replace("\"", "\"\"") + "\"" else text
  }

  private fun neutralized(text: String): String =
    if (text.isNotEmpty() && text.first() in FORMULA_TRIGGERS) "'$text" else text

  private companion object {
    val BOM = byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte())
    val FORMULA_TRIGGERS = setOf('=', '+', '-', '@', '\t', '\r')
  }
}

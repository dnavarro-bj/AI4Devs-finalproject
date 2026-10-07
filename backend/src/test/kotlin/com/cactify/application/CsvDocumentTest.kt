package com.cactify.application

import com.cactify.CsvTestReader
import com.cactify.application.export.CsvDocument
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.LocalDate
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Exportación del inventario filtrado a CSV» y «Las celdas no se interpretan como fórmulas». */
class CsvDocumentTest {

  private val bom = byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte())

  private fun render(vararg row: Any?, header: List<String> = listOf("a", "b")): String =
    CsvDocument(header).apply { row(row.toList()) }.toText()

  @Test
  fun `the document starts with the byte order mark and the header`() {
    val bytes = CsvDocument(listOf("código", "apodo")).toBytes()

    assertContentEquals(bom, bytes.copyOfRange(0, 3))
    assertEquals("código,apodo\r\n", String(bytes, 3, bytes.size - 3, Charsets.UTF_8))
  }

  @Test
  fun `a document without rows is only the header`() {
    assertEquals("a,b\r\n", CsvDocument(listOf("a", "b")).toText())
  }

  @Test
  fun `every row ends with CRLF`() {
    assertEquals("a,b\r\n1,2\r\n3,4\r\n", CsvDocument(listOf("a", "b")).apply { row(listOf(1, 2)); row(listOf(3, 4)) }.toText())
  }

  @Test
  fun `a cell with a comma is quoted`() {
    assertEquals("a,b\r\n\"x, y\",z\r\n", render("x, y", "z"))
  }

  @Test
  fun `quotes are doubled inside a quoted cell`() {
    assertEquals("a,b\r\n\"Cactus \"\"grande\"\"\",z\r\n", render("Cactus \"grande\"", "z"))
  }

  @Test
  fun `a line break inside a cell stays inside quotes`() {
    assertEquals("a,b\r\n\"uno\ndos\",z\r\n", render("uno\ndos", "z"))
    assertEquals("a,b\r\n\"uno\r\ndos\",z\r\n", render("uno\r\ndos", "z"))
  }

  @Test
  fun `null is an empty cell`() {
    assertEquals("a,b\r\n,x\r\n", render(null, "x"))
  }

  @Test
  fun `numbers and dates are written as they are`() {
    val text = render(-5, LocalDate.of(2026, 10, 7))
    assertEquals("a,b\r\n-5,2026-10-07\r\n", text)
    assertEquals("a,b\r\n2026-10-07T09:30:00Z,1.5\r\n", render(Instant.parse("2026-10-07T09:30:00Z"), 1.5))
  }

  @Test
  fun `a text cell that looks like a formula gets an apostrophe`() {
    for (trigger in listOf("=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx")) {
      val text = render(trigger, "ok")
      assertTrue(text.contains("'" + trigger.first()), "«${trigger.replace("\t", "\\t").replace("\r", "\\r")}» debía llevar apóstrofo")
    }
  }

  @Test
  fun `the apostrophe goes before the formula`() {
    assertEquals("a,b\r\n\"'=HYPERLINK(\"\"http://example.com\"\",\"\"pulsa\"\")\",ok\r\n", render("=HYPERLINK(\"http://example.com\",\"pulsa\")", "ok"))
  }

  @Test
  fun `a dash in the middle of a text is not a formula`() {
    assertEquals("a,b\r\nAsiento-de-suegra,x\r\n", render("Asiento-de-suegra", "x"))
  }

  @Test
  fun `a number starting with a minus is not touched but the same text is`() {
    assertEquals("a,b\r\n-5,'-5\r\n", render(-5, "-5"))
  }

  @Test
  fun `a row with a different number of cells than the header is rejected`() {
    val document = CsvDocument(listOf("a", "b"))
    kotlin.runCatching { document.row(listOf("solo uno")) }.let { assertTrue(it.isFailure) }
  }

  @Test
  fun `reading the document back gives the same cells`() {
    val cells = listOf("Cactus, \"grande\"", "uno\ndos", "'=raro", "plano")
    val text = CsvDocument(listOf("a", "b", "c", "d")).apply { row(cells) }.toText()

    assertEquals(cells, CsvTestReader.parse(text.substringAfter("\r\n")).single())
  }
}

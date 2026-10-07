package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Los enumerados de la cronología, con el patrón de ADR-007. */
class TimelineEnumsTest {

  @Test
  fun `intervention types parse their persisted values`() {
    assertEquals(
      listOf("trasplante", "sustrato", "tratamiento", "fertilizacion", "poda", "revision"),
      InterventionType.entries.map { it.value },
    )
    assertEquals(InterventionType.Fertilization, InterventionType(" Fertilizacion "))
    assertEquals("trasplante", InterventionType.Transplant.toString())
  }

  @Test
  fun `an unknown intervention type names the valid ones`() {
    val error = assertFailsWith<IllegalArgumentException> { InterventionType("riego") }

    assertEquals(true, error.message!!.contains("riego") && error.message!!.contains("poda"))
  }

  @Test
  fun `bloom statuses parse their persisted values`() {
    assertEquals(listOf("boton", "en_flor", "finalizada"), BloomStatus.entries.map { it.value })
    assertEquals(BloomStatus.InBloom, BloomStatus(" EN_FLOR "))
    assertEquals("finalizada", BloomStatus.Finished.toString())
    assertFailsWith<IllegalArgumentException> { BloomStatus("marchita") }
  }

  @Test
  fun `timeline types parse their persisted values`() {
    assertEquals(
      listOf("lectura", "cambio_estado", "movimiento", "comentario", "intervencion", "floracion", "tarea"),
      TimelineType.entries.map { it.value },
    )
    assertEquals(TimelineType.StatusChange, TimelineType("cambio_estado"))
    assertEquals("floracion", TimelineType.Bloom.toString())
    assertEquals(TimelineType.Task, TimelineType("tarea"))
  }

  @Test
  fun `an unknown timeline type names the valid ones`() {
    val error = assertFailsWith<IllegalArgumentException> { TimelineType("alerta") }

    assertEquals(true, error.message!!.contains("alerta") && error.message!!.contains("lectura"))
  }
}

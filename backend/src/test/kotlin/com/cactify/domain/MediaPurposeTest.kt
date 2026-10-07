package com.cactify.domain

import com.cactify.infrastructure.persistence.converters.MediaPurposeConverter
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

/** El propósito de una fotografía de ejemplar, con el patrón de ADR-007. */
class MediaPurposeTest {

  @Test
  fun `purposes parse their persisted values`() {
    assertEquals(listOf("general", "detalle", "etiqueta_fisica"), MediaPurpose.entries.map { it.value })
    assertEquals(MediaPurpose.PhysicalLabel, MediaPurpose(" Etiqueta_Fisica "))
    assertEquals("detalle", MediaPurpose.Detail.toString())
  }

  @Test
  fun `an unknown purpose names the valid ones`() {
    val error = assertFailsWith<IllegalArgumentException> { MediaPurpose("selfie") }

    assertEquals(true, error.message!!.contains("selfie") && error.message!!.contains("etiqueta_fisica"))
  }

  @Test
  fun `the converter round-trips through the explicit value`() {
    val converter = MediaPurposeConverter()

    assertEquals("etiqueta_fisica", converter.convertToDatabaseColumn(MediaPurpose.PhysicalLabel))
    assertEquals(MediaPurpose.General, converter.convertToEntityAttribute("general"))
    assertNull(converter.convertToDatabaseColumn(null))
    assertNull(converter.convertToEntityAttribute(null))
  }
}

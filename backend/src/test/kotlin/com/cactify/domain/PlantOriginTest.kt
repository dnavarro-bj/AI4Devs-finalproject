package com.cactify.domain

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PlantOriginTest {

  @Test
  fun `the six origins have an explicit value`() {
    assertEquals(
      listOf("vivero", "intercambio", "germinacion_propia", "compra", "regalo", "otro"),
      PlantOrigin.entries.map { it.value },
    )
  }

  @Test
  fun `invoke normalizes and rejects the unknown`() {
    assertEquals(PlantOrigin.OwnGermination, PlantOrigin(" Germinacion_Propia "))
    assertFailsWith<IllegalArgumentException> { PlantOrigin("robado") }
  }
}

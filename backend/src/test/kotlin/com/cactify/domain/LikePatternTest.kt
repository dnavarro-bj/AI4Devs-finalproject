package com.cactify.domain

import com.cactify.domain.specs.LikePattern
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/** El texto de una búsqueda es literal: los comodines de `LIKE` no pueden colarse. */
class LikePatternTest {

  @Test
  fun `plain text is left as it is`() {
    assertEquals("CAT-GRUSS", LikePattern.escape("CAT-GRUSS"))
  }

  @Test
  fun `the wildcards are escaped`() {
    assertEquals("\\%", LikePattern.escape("%"))
    assertEquals("\\_", LikePattern.escape("_"))
    assertEquals("A\\%B\\_C", LikePattern.escape("A%B_C"))
  }

  @Test
  fun `the escape character is escaped too`() {
    assertEquals("\\\\", LikePattern.escape("\\"))
    assertEquals("\\\\\\%", LikePattern.escape("\\%"))
  }

  @Test
  fun `contains wraps the escaped text`() {
    assertEquals("%GRU\\_SS%", LikePattern.contains("GRU_SS"))
  }

  @Test
  fun `the escape character is the backslash`() {
    assertEquals('\\', LikePattern.ESCAPE)
  }
}

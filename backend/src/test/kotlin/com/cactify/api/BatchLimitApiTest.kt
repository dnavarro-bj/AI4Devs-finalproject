package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenario «Demasiado grande» de la previsualización y de aplicar, con el máximo en 4 plantas. */
@TestPropertySource(properties = ["cactify.batch.max-plants=4"])
class BatchLimitApiTest : AbstractBatchApiTest() {

  @Test
  fun `a scope above the maximum is a 422 that says how many plants and the maximum`() {
    repeat(5) { createPlantIn(invernadero) }

    preview(locationScope(invernadero))
      .andExpect(status().isUnprocessableEntity)
      .andExpect(jsonPath("$.status").value(422))
      .andExpect(jsonPath("$.message").value("5 plantas superan el máximo de 4: acota el alcance"))
      .andExpect(jsonPath("$.path").value("/batches/preview"))
  }

  @Test
  fun `applying above the maximum writes nothing`() {
    val plants = (1..5).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "Nota"))
      .andExpect(status().isUnprocessableEntity)
      .andExpect(jsonPath("$.message").value("5 plantas superan el máximo de 4: acota el alcance"))

    plants.forEach { timeline(it).andExpect(jsonPath("$.totalElements").value(0)) }
    assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM batch", Long::class.java))
  }

  @Test
  fun `exactly the maximum is accepted`() {
    repeat(4) { createPlantIn(invernadero) }

    preview(locationScope(invernadero)).andExpect(status().isOk).andExpect(jsonPath("$.count").value(4))
  }

  @Test
  fun `a list longer than the maximum is also a 422`() {
    val plants = (1..5).map { createPlantIn(invernadero) }

    preview(plantsScope(*plants.toTypedArray())).andExpect(status().isUnprocessableEntity)
  }

  @Test
  fun `the exclusions count toward the maximum only after being applied`() {
    val plants = (1..5).map { createPlantIn(invernadero) }

    preview(locationScope(invernadero), "excludedPlantIds" to listOf(plants[0]))
      .andExpect(status().isUnprocessableEntity)
  }
}

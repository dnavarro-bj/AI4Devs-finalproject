package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Alcance de un lote» y «Cuántas plantas afectaría un lote». */
class BatchPreviewApiTest : AbstractBatchApiTest() {

  @Test
  fun `a list of plants is the scope`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    preview(plantsScope(*plants.toTypedArray()))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.count").value(3))
  }

  @Test
  fun `a location counts the plants in it and in its sublocations when asked`() {
    repeat(2) { createPlantIn(invernadero) }
    repeat(4) { createPlantIn(bandeja) }
    createPlantIn("300002")

    preview(locationScope(invernadero, includeDescendants = true)).andExpect(jsonPath("$.count").value(6))
    preview(locationScope(invernadero)).andExpect(jsonPath("$.count").value(2))
  }

  @Test
  fun `the result of a filter is every plant the list would return, not one page`() {
    repeat(5) { createPlantIn(invernadero, species = "200002") }
    repeat(3) { createPlantIn(invernadero, species = "200001") }

    preview(queryScope("species=200002")).andExpect(jsonPath("$.count").value(5))
  }

  @Test
  fun `page, size and sort of the query are ignored`() {
    repeat(5) { createPlantIn(invernadero, species = "200002") }

    preview(queryScope("species=200002&page=1&size=2&sort=code,desc")).andExpect(jsonPath("$.count").value(5))
    preview(queryScope("species=200002&sort=lastReview,desc")).andExpect(jsonPath("$.count").value(5))
  }

  @Test
  fun `a query by status counts only plants in progress even if it names every status`() {
    val sold = createPlantIn(invernadero)
    createPlantIn(invernadero)
    archive(sold)

    preview(queryScope("status=activa&status=vendida&status=cuarentena&status=muerta")).andExpect(jsonPath("$.count").value(1))
  }

  @Test
  fun `archived plants are left out even if the list names them`() {
    val sold = createPlantIn(invernadero)
    val kept = createPlantIn(invernadero)
    archive(sold)

    preview(plantsScope(sold, kept)).andExpect(jsonPath("$.count").value(1))
  }

  @Test
  fun `exclusions are discounted`() {
    val plants = (1..4).map { createPlantIn(invernadero) }

    preview(locationScope(invernadero), "excludedPlantIds" to listOf(plants[0], plants[1])).andExpect(jsonPath("$.count").value(2))
  }

  @Test
  fun `an exclusion outside the scope is rejected`() {
    val inside = createPlantIn(invernadero)
    val outside = createPlantIn("300002")

    preview(plantsScope(inside), "excludedPlantIds" to listOf(outside)).andExpect(status().isBadRequest)
  }

  @Test
  fun `an empty scope counts zero without being an error`() {
    preview(locationScope(invernadero)).andExpect(status().isOk).andExpect(jsonPath("$.count").value(0))
  }

  @Test
  fun `an invalid query is a 400`() {
    preview(queryScope("status=resucitada")).andExpect(status().isBadRequest)
    preview(queryScope("colour=red")).andExpect(status().isBadRequest)
    preview(queryScope("species=abc")).andExpect(status().isBadRequest)
  }

  @Test
  fun `a plant or a location that does not exist is a 400`() {
    preview(plantsScope("123456789")).andExpect(status().isBadRequest)
    preview(locationScope("123456789")).andExpect(status().isBadRequest)
  }

  @Test
  fun `more than one form, or none, is a 400`() {
    val plant = createPlantIn(invernadero)

    preview(mapOf("kind" to "plants", "plantIds" to listOf(plant), "locationId" to invernadero)).andExpect(status().isBadRequest)
    preview(mapOf("kind" to "location", "locationId" to invernadero, "query" to "species=200001")).andExpect(status().isBadRequest)
    preview(mapOf("kind" to "plants")).andExpect(status().isBadRequest)
    preview(mapOf("kind" to "location")).andExpect(status().isBadRequest)
    preview(mapOf("kind" to "query")).andExpect(status().isBadRequest)
    preview(mapOf("kind" to "todo")).andExpect(status().isBadRequest)
    send("POST", "/batches/preview", "{}").andExpect(status().isBadRequest)
  }

  @Test
  fun `previewing writes nothing`() {
    val plant = createPlantIn(invernadero)

    preview(plantsScope(plant)).andExpect(status().isOk)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
    careRecordsOf(plant).andExpect(jsonPath("$.totalElements").value(0))
    org.junit.jupiter.api.Assertions.assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM batch", Long::class.java))
  }

  @Test
  fun `the number is the one a batch then writes to`() {
    val plants = (1..5).map { createPlantIn(invernadero) }
    archive(plants[4])
    val excluded = listOf(plants[0])
    val scope = locationScope(invernadero)

    preview(scope, "excludedPlantIds" to excluded).andExpect(jsonPath("$.count").value(3))
    applyBatch(scope, "comment" to mapOf("text" to "Nota"), "excludedPlantIds" to excluded)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.plantCount").value(3))
  }
}

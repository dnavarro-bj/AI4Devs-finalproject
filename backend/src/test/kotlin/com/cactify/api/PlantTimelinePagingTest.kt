package com.cactify.api

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Paginación de la cronología» y «Filtro de la cronología por tipo». */
class PlantTimelinePagingTest : AbstractTimelineApiTest() {

  /** 10 comentarios, 10 intervenciones, 3 floraciones y 7 lecturas, repartidos en el tiempo. */
  private fun plantWith30Events(): String {
    val plant = createPlant()
    var day = 100L
    repeat(10) { addComment(plant, "c$it", daysAgo(day--)) }
    repeat(10) { addIntervention(plant, "poda", "occurredAt" to daysAgo(day--).toString()) }
    repeat(3) { addBloom(plant, "en_flor", dateDaysAgo(day--)) }
    repeat(7) {
      mockMvc.perform(
        post("/plants/$plant/care-records").contentType(MediaType.APPLICATION_JSON)
          .content(json("humidity" to 30, "recordedAt" to daysAgo(day--).toString())),
      ).andExpect(status().isCreated)
    }
    return plant
  }

  private fun ids(plant: String, vararg params: Pair<String, String>): List<String> {
    val tree = objectMapper.readTree(timeline(plant, *params).andReturn().response.contentAsString)
    return tree.get("content").map { "${it.get("type").asText()}:${it.get("id").asText()}" }
  }

  @Test
  fun `walking all the pages loses and repeats nothing`() {
    val plant = plantWith30Events()

    val pages = (0..2).flatMap { ids(plant, "page" to "$it", "size" to "10") }

    assertEquals(30, pages.size)
    assertEquals(30, pages.toSet().size)
    assertEquals(ids(plant, "size" to "30"), pages)
  }

  @Test
  fun `the total is the whole history and not the page`() {
    val plant = plantWith30Events()

    timeline(plant, "size" to "10")
      .andExpect(jsonPath("$.totalElements").value(30))
      .andExpect(jsonPath("$.totalPages").value(3))
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(10))
  }

  @Test
  fun `filtering by one type counts them all`() {
    val plant = plantWith30Events()

    timeline(plant, "type" to "floracion")
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].type").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.`is`("floracion"))))
  }

  @Test
  fun `filtering by several types mixes them in time order`() {
    val plant = plantWith30Events()

    val filtered = ids(plant, "type" to "comentario", "type" to "intervencion", "size" to "50")

    assertEquals(20, filtered.size)
    assertEquals(ids(plant, "size" to "50").filter { it.startsWith("comentario") || it.startsWith("intervencion") }, filtered)
  }

  @Test
  fun `the filter keeps the relative order`() {
    val plant = plantWith30Events()

    assertEquals(
      ids(plant, "size" to "50").filter { it.startsWith("lectura") },
      ids(plant, "type" to "lectura", "size" to "50"),
    )
  }

  @Test
  fun `the filter applies before paginating`() {
    val plant = plantWith30Events()

    timeline(plant, "type" to "floracion", "size" to "10")
      .andExpect(jsonPath("$.content.length()").value(3))
      .andExpect(jsonPath("$.totalPages").value(1))
  }

  @Test
  fun `an unknown type answers 400 listing the valid ones`() {
    timeline(createPlant(), "type" to "telepatia")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("floracion")))
  }
}

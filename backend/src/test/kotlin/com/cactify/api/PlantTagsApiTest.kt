package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsInAnyOrder
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de "Asignación de tags a una planta". */
class PlantTagsApiTest : AbstractApiIntegrationTest() {

  private val seededSpeciesId = "200001"
  private val seededLocationId = "300001"
  private val globular = "400001"
  private val small = "400002"
  private val hybrid = "400004"

  @Test
  fun `assigning several tags leaves exactly those tags on the detail`() {
    val plantId = createPlant("Bola tags")

    assignTags(plantId, globular, small).andExpect(status().isOk)

    expectTags(plantId, "globular", "pequeno")
  }

  @Test
  fun `assigning a new set replaces the previous one`() {
    val plantId = createPlant("Bola reemplazo")
    assignTags(plantId, globular, small).andExpect(status().isOk)

    assignTags(plantId, hybrid).andExpect(status().isOk)

    expectTags(plantId, "hibrido")
  }

  @Test
  fun `assigning an empty set clears the tags`() {
    val plantId = createPlant("Bola vaciado")
    assignTags(plantId, globular, small).andExpect(status().isOk)

    assignTags(plantId).andExpect(status().isOk)

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.tags.length()").value(0))
  }

  @Test
  fun `assigning the same set twice is idempotent and leaves no duplicates`() {
    val plantId = createPlant("Bola idempotente")

    assignTags(plantId, globular, small).andExpect(status().isOk)
    assignTags(plantId, globular, small).andExpect(status().isOk)

    expectTags(plantId, "globular", "pequeno")
    flushPersistenceContext()
    val rows = jdbcTemplate.queryForObject(
      "SELECT count(*) FROM plant_tag WHERE plant_id = ?",
      Int::class.java,
      plantId.toLong(),
    )
    kotlin.test.assertEquals(2, rows)
  }

  @Test
  fun `a nonexistent tag answers 400 and leaves the previous tags untouched`() {
    val plantId = createPlant("Bola tag invalido")
    assignTags(plantId, globular).andExpect(status().isOk)

    assignTags(plantId, small, "999999999")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("999999999")))

    expectTags(plantId, "globular")
  }

  @Test
  fun `assigning tags to a nonexistent plant answers 404`() {
    assignTags("999999999", globular)
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  private fun assignTags(plantId: String, vararg tagIds: String) =
    mockMvc.perform(
      put("/plants/$plantId/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("tagIds" to tagIds.toList()))),
    )

  private fun expectTags(plantId: String, vararg names: String) {
    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.tags.length()").value(names.size))
      .andExpect(jsonPath("$.tags[*].name").value(containsInAnyOrder(*names)))
  }

  private fun createPlant(nickname: String): String {
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to seededLocationId, "speciesId" to seededSpeciesId)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }
}

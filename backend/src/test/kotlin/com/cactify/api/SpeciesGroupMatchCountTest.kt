package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de «Los grupos de especies son dinámicos». Las semillas son tres especies con
 * temperatura mínima 10 (grusonii), 12 (mammillaria) y 10 (echeveria), sin exposición definida.
 */
class SpeciesGroupMatchCountTest : AbstractApiIntegrationTest() {

  private fun saveGroup(name: String, query: String): String {
    val result = mockMvc.perform(
      post("/saved-views").contentType(MediaType.APPLICATION_JSON)
        .content(json("scope" to "species", "name" to name, "query" to query)),
    ).andExpect(status().isCreated).andReturn()
    return objectMapper.readTree(result.response.contentAsString).get("id").asText()
  }

  private fun groupCount(id: String): Long =
    objectMapper.readTree(mockMvc.perform(get("/saved-views/$id")).andReturn().response.contentAsString).get("matchCount").asLong()

  @Test
  fun `the count is how many species meet the rule today`() {
    val id = saveGroup("Sensibles al frío", "minTemperatureFrom=11")

    assertEquals(1, groupCount(id))
    mockMvc.perform(get("/saved-views").param("scope", "species"))
      .andExpect(jsonPath("$.content[0].matchCount").value(1))
  }

  @Test
  fun `a group without rules counts all the species`() {
    assertEquals(3, groupCount(saveGroup("Todas", "")))
  }

  @Test
  fun `a species leaves the group by itself when its characteristics change`() {
    val id = saveGroup("Sensibles al frío", "minTemperatureFrom=10")
    assertEquals(3, groupCount(id))

    jdbcTemplate.update("UPDATE species SET min_temperature = 5 WHERE id = 200001")

    assertEquals(2, groupCount(id))
  }

  @Test
  fun `a species enters the group by itself when its characteristics change`() {
    val id = saveGroup("Semisombra", "exposure=semisombra")
    assertEquals(0, groupCount(id))

    jdbcTemplate.update("UPDATE species SET sun_exposure = 'semisombra' WHERE id = 200002")

    assertEquals(1, groupCount(id))
  }

  @Test
  fun `a group on a soil mix that is removed keeps existing with a count of zero`() {
    jdbcTemplate.update("INSERT INTO soil_mix (id, name, organic_percentage, mineral_percentage, ph_min, ph_max) VALUES (990001, 'Temporal', 30, 70, 6.0, 7.0)")
    val id = saveGroup("Con mezcla", "soilMix=990001")
    assertEquals(0, groupCount(id))

    jdbcTemplate.update("DELETE FROM soil_mix WHERE id = 990001")

    assertEquals(0, groupCount(id))
    mockMvc.perform(get("/saved-views/$id")).andExpect(status().isOk)
  }

  @Test
  fun `a rule in months that cross the year end counts the species that cover them`() {
    jdbcTemplate.update(
      "INSERT INTO species_period (id, species_id, period_type, start_month, end_month) VALUES (990101, 200001, 'crecimiento', 11, 3)",
    )

    assertEquals(1, groupCount(saveGroup("Invernal", "growthMonth=12&growthMonth=1&growthMonth=2")))
  }

  @Test
  fun `the plants views carry no count`() {
    mockMvc.perform(
      post("/saved-views").contentType(MediaType.APPLICATION_JSON)
        .content(json("scope" to "plants", "name" to "Cuarentena", "query" to "status=cuarentena")),
    ).andExpect(jsonPath("$.matchCount").doesNotExist())

    mockMvc.perform(get("/saved-views").param("scope", "plants"))
      .andExpect(jsonPath("$.content[0].matchCount").doesNotExist())
  }

  private fun assertEquals(expected: Long, actual: Long) = kotlin.test.assertEquals(expected, actual)
  private fun assertEquals(expected: Int, actual: Long) = kotlin.test.assertEquals(expected.toLong(), actual)
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Una vista guardada no puede ser inservible». */
class SavedViewValidationApiTest : AbstractApiIntegrationTest() {

  private fun save(scope: String, query: String?, columns: List<String>? = null): ResultActions =
    mockMvc.perform(
      post("/saved-views").contentType(MediaType.APPLICATION_JSON)
        .content(json("scope" to scope, "name" to "Vista", "query" to query, "columns" to columns)),
    )

  private fun assertNothingSaved() =
    assertEquals(0, jdbcTemplate.queryForObject("SELECT count(*) FROM saved_view", Int::class.java))

  @Test
  fun `a value the listing would reject is rejected`() {
    save("species", "growthMonth=13").andExpect(status().isBadRequest)
    save("species", "exposure=playa").andExpect(status().isBadRequest)
    save("species", "minTemperatureFrom=frio").andExpect(status().isBadRequest)
    save("plants", "status=resucitada").andExpect(status().isBadRequest)
    save("plants", "species=abc").andExpect(status().isBadRequest)
    assertNothingSaved()
  }

  @Test
  fun `a sort key that is not public is rejected`() {
    save("plants", "sort=lastReview,desc").andExpect(status().isBadRequest)
    save("plants", "sort=tagSet,asc").andExpect(status().isBadRequest)
    save("plants", "sort=code,sideways").andExpect(status().isBadRequest)
    save("species", "sort=periodRows,asc").andExpect(status().isBadRequest)
    assertNothingSaved()
  }

  @Test
  fun `a public sort key is accepted and kept in order`() {
    save("plants", "sort=species,asc&sort=code,desc")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.query").value("sort=species,asc&sort=code,desc"))
  }

  @Test
  fun `an unknown parameter is rejected`() {
    save("species", "colour=red").andExpect(status().isBadRequest)
    save("plants", "colour=red").andExpect(status().isBadRequest)
    assertNothingSaved()
  }

  @Test
  fun `a parameter of the other scope is rejected`() {
    save("plants", "growthMonth=1").andExpect(status().isBadRequest)
    save("species", "status=activa").andExpect(status().isBadRequest)
  }

  @Test
  fun `the paging is discarded`() {
    save("plants", "status=cuarentena&page=3&size=25")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.query").value("status=cuarentena"))
  }

  @Test
  fun `an unknown scope is rejected`() {
    save("tags", "").andExpect(status().isBadRequest)
  }

  @Test
  fun `columns of a scope that has none are rejected`() {
    save("species", "minTemperatureFrom=9", listOf("species")).andExpect(status().isBadRequest)
    assertNothingSaved()
  }

  @Test
  fun `an unknown column is rejected`() {
    save("plants", "", listOf("password")).andExpect(status().isBadRequest)
    assertNothingSaved()
  }

  @Test
  fun `a reference that no longer exists is not an error`() {
    // Como en el listado: una especie o una localización que no existen dan un resultado vacío.
    save("plants", "species=999999999&location=999999999").andExpect(status().isCreated)
  }

  @Test
  fun `a rejected replacement keeps the saved view as it was`() {
    val created = save("plants", "status=cuarentena", listOf("species"))
    val id = objectMapper.readTree(created.andReturn().response.contentAsString).get("id").asText()

    mockMvc.perform(
      org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/saved-views/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("scope" to "plants", "name" to "Vista", "query" to "status=resucitada")),
    ).andExpect(status().isBadRequest)

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/saved-views/$id"))
      .andExpect(jsonPath("$.query").value("status=cuarentena"))
      .andExpect(jsonPath("$.columns[0]").value("species"))
  }
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Vistas guardadas del listado» y «El nombre de una vista es único por ámbito». */
class SavedViewApiTest : AbstractApiIntegrationTest() {

  private fun body(scope: String = "plants", name: String = "Cuarentena", query: String? = "status=cuarentena", columns: List<String>? = null) =
    json("scope" to scope, "name" to name, "query" to query, "columns" to columns)

  private fun create(scope: String = "plants", name: String = "Cuarentena", query: String? = "status=cuarentena", columns: List<String>? = null): ResultActions =
    mockMvc.perform(post("/saved-views").contentType(MediaType.APPLICATION_JSON).content(body(scope, name, query, columns)))

  private fun idOf(result: ResultActions): String =
    objectMapper.readTree(result.andReturn().response.contentAsString).get("id").asText()

  @Test
  fun `a plants view is saved with its query and its columns`() {
    create(
      name = "Cuarentena de Invernadero 1",
      query = "status=cuarentena&location=300001&sort=code,asc",
      columns = listOf("species", "location"),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isString)
      .andExpect(jsonPath("$.scope").value("plants"))
      .andExpect(jsonPath("$.name").value("Cuarentena de Invernadero 1"))
      .andExpect(jsonPath("$.query").value("location=300001&sort=code,asc&status=cuarentena"))
      .andExpect(jsonPath("$.columns[0]").value("species"))
      .andExpect(jsonPath("$.columns[1]").value("location"))
      .andExpect(jsonPath("$.createdAt").exists())
  }

  @Test
  fun `a species group is saved`() {
    create("species", "Sensibles al frío", "minTemperatureFrom=9")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.scope").value("species"))
      .andExpect(jsonPath("$.query").value("minTemperatureFrom=9"))
      .andExpect(jsonPath("$.columns").doesNotExist())
  }

  @Test
  fun `a view without a query is valid`() {
    create(query = null).andExpect(status().isCreated).andExpect(jsonPath("$.query").value(""))
  }

  @Test
  fun `a view can be read back`() {
    val id = idOf(create(columns = listOf("status")))

    mockMvc.perform(get("/saved-views/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(id))
      .andExpect(jsonPath("$.name").value("Cuarentena"))
      .andExpect(jsonPath("$.columns[0]").value("status"))
  }

  @Test
  fun `a replacement is complete and keeps the identity and the creation date`() {
    val created = create(name = "Antes", query = "status=cuarentena&q=x", columns = listOf("species"))
    val id = idOf(created)
    val createdAt = objectMapper.readTree(created.andReturn().response.contentAsString).get("createdAt").asText()

    mockMvc.perform(put("/saved-views/$id").contentType(MediaType.APPLICATION_JSON).content(body("plants", "Después", "species=200001", null)))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(id))
      .andExpect(jsonPath("$.name").value("Después"))
      .andExpect(jsonPath("$.query").value("species=200001"))
      .andExpect(jsonPath("$.columns").doesNotExist())
      .andExpect(jsonPath("$.createdAt").value(createdAt))
  }

  @Test
  fun `a view is removed without touching plants or species`() {
    val id = idOf(create())
    val species = jdbcTemplate.queryForObject("SELECT count(*) FROM species", Int::class.java)

    mockMvc.perform(delete("/saved-views/$id")).andExpect(status().isNoContent)

    mockMvc.perform(get("/saved-views/$id")).andExpect(status().isNotFound)
    assertEquals(species, jdbcTemplate.queryForObject("SELECT count(*) FROM species", Int::class.java))
  }

  @Test
  fun `a blank name is rejected and nothing is created`() {
    create(name = "   ").andExpect(status().isBadRequest)
    create(name = "").andExpect(status().isBadRequest)

    assertEquals(0, jdbcTemplate.queryForObject("SELECT count(*) FROM saved_view", Int::class.java))
  }

  @Test
  fun `an unknown view answers 404 in the uniform format`() {
    mockMvc.perform(get("/saved-views/123"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.path").value("/saved-views/123"))
    mockMvc.perform(put("/saved-views/123").contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isNotFound)
    mockMvc.perform(delete("/saved-views/123")).andExpect(status().isNotFound)
  }

  @Test
  fun `a malformed identifier answers 400`() {
    mockMvc.perform(get("/saved-views/abc")).andExpect(status().isBadRequest)
  }

  @Test
  fun `a repeated name in the same scope is a conflict, ignoring case and surrounding spaces`() {
    create("species", "Sensibles al frío", "").andExpect(status().isCreated)

    create("species", " sensibles al FRÍO ", "").andExpect(status().isConflict)

    assertEquals(1, jdbcTemplate.queryForObject("SELECT count(*) FROM saved_view", Int::class.java))
  }

  @Test
  fun `the same name is allowed in another scope`() {
    create("plants", "Cuarentena").andExpect(status().isCreated)
    create("species", "Cuarentena", "").andExpect(status().isCreated)
  }

  @Test
  fun `a view can keep its own name when it is replaced`() {
    val id = idOf(create(name = "Cuarentena"))

    mockMvc.perform(put("/saved-views/$id").contentType(MediaType.APPLICATION_JSON).content(body(name = "Cuarentena", query = "status=enferma")))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.query").value("status=enferma"))
  }

  @Test
  fun `a view cannot take the name of another one`() {
    create(name = "Una").andExpect(status().isCreated)
    val id = idOf(create(name = "Otra"))

    mockMvc.perform(put("/saved-views/$id").contentType(MediaType.APPLICATION_JSON).content(body(name = "una")))
      .andExpect(status().isConflict)
  }

  @Test
  fun `the views are listed`() {
    create(name = "B").andExpect(status().isCreated)
    create(name = "A").andExpect(status().isCreated)

    mockMvc.perform(get("/saved-views"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[*].name").value(hasItems("A", "B")))
  }
}

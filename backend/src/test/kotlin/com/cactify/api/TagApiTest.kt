package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de alta, unicidad, listado y paginación del catálogo de tags. */
class TagApiTest : AbstractApiIntegrationTest() {

  @Test
  fun `a tag is created correctly`() {
    clearTags()

    mockMvc.perform(
      post("/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "globular")),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.name").value("globular"))
  }

  @Test
  fun `a name with surrounding spaces is stored trimmed`() {
    clearTags()

    mockMvc.perform(
      post("/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to " globular ")),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.name").value("globular"))

    mockMvc.perform(get("/tags"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].name").value("globular"))
  }

  @Test
  fun `a tag without a name is rejected with 400 and none is created`() {
    val before = countTags()

    mockMvc.perform(
      post("/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "   ")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))

    assertEquals(before, countTags(), "no debía crearse ningún tag")
  }

  @Test
  fun `an exact duplicate is rejected with 409 and the catalog keeps a single tag`() {
    clearTags()
    createTag("globular")

    mockMvc.perform(
      post("/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "globular")),
    )
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.message").isNotEmpty)

    assertEquals(1, countTags())
  }

  @Test
  fun `a duplicate differing only in capitalisation or spaces is rejected with 409`() {
    clearTags()
    createTag("globular")

    mockMvc.perform(
      post("/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to " Globular ")),
    )
      .andExpect(status().isConflict)

    assertEquals(1, countTags(), "no debía crearse un segundo tag")
  }

  @Test
  fun `the catalog lists the registered tags`() {
    clearTags()
    createTag("globular")
    createTag("pequeno")
    createTag("hibrido")

    mockMvc.perform(get("/tags"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].name").value(hasItems("globular", "pequeno", "hibrido")))
      .andExpect(jsonPath("$.content[0].id").isNotEmpty)
  }

  @Test
  fun `the tag catalog is paginated by default`() {
    mockMvc.perform(get("/tags"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(25))
      .andExpect(jsonPath("$.totalElements").isNumber)
      .andExpect(jsonPath("$.totalPages").isNumber)
  }

  private fun createTag(name: String) {
    mockMvc.perform(
      post("/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to name)),
    ).andExpect(status().isCreated)
  }

  private fun countTags(): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM tag", Int::class.java) ?: 0
}

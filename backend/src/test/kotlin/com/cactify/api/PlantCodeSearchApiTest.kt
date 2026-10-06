package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsInAnyOrder
import org.hamcrest.Matchers.everyItem
import org.hamcrest.Matchers.startsWith
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Filtro del inventario por código». */
class PlantCodeSearchApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001" // CAT-GRUSS
  private val mammillaria = "200002" // CAT-MAMMI

  private fun createPlant(speciesId: String, locationId: String = "300001") {
    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Planta", "locationId" to locationId, "speciesId" to speciesId)),
    ).andExpect(status().isCreated)
  }

  /** Tres grusonii (dos en la localización 1, una en la 2) y dos mammillaria. */
  private fun seed() {
    clearPlants()
    createPlant(grusonii)
    createPlant(grusonii)
    createPlant(grusonii, "300002")
    createPlant(mammillaria)
    createPlant(mammillaria)
  }

  private fun search(code: String?) =
    mockMvc.perform(get("/plants").apply { if (code != null) param("code", code) })

  @Test
  fun `the full code finds the plant`() {
    seed()

    search("CAT-GRUSS-01")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS-01"))
  }

  @Test
  fun `a partial text matches without caring about case`() {
    seed()

    search("gruss")
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].code").value(containsInAnyOrder("CAT-GRUSS-01", "CAT-GRUSS-02", "CAT-GRUSS-03")))
  }

  @Test
  fun `the prefix of a species finds all its plants and no others`() {
    seed()

    search("CAT-GRUSS-")
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].code").value(everyItem(startsWith("CAT-GRUSS-"))))
  }

  @Test
  fun `a code search combines with the location filter`() {
    seed()

    mockMvc.perform(get("/plants").param("code", "gruss").param("location", "300002"))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS-03"))
  }

  @Test
  fun `a blank text is ignored as if the filter was not given`() {
    seed()

    search("   ").andExpect(jsonPath("$.totalElements").value(5))
    search("").andExpect(jsonPath("$.totalElements").value(5))
  }

  @Test
  fun `a text that is in no code returns an empty page, not an error`() {
    seed()

    search("NO-EXISTE")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
      .andExpect(jsonPath("$.content.length()").value(0))
  }

  @Test
  fun `the wildcards are searched as literal text`() {
    seed()

    search("%").andExpect(status().isOk).andExpect(jsonPath("$.totalElements").value(0))
    search("_").andExpect(status().isOk).andExpect(jsonPath("$.totalElements").value(0))
    search("CAT_GRUSS").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the filtered result is paginated and declares the total of matches`() {
    seed()

    mockMvc.perform(get("/plants").param("code", "cat").param("size", "2").param("page", "0"))
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
      .andExpect(jsonPath("$.content.length()").value(2))
    mockMvc.perform(get("/plants").param("code", "cat").param("size", "2").param("page", "2"))
      .andExpect(jsonPath("$.content.length()").value(1))
  }
}

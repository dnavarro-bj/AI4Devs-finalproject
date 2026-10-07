package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.contains
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Ordenación del inventario por claves públicas» (ADR-016). */
class PlantSortApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001" // Echinocactus grusonii
  private val mammillaria = "200002" // Mammillaria elongata
  private val echeveria = "200003" // Echeveria elegans

  private val invernadero = "300001" // Invernadero 1
  private val bandeja = "300002" // Bandeja A3
  private val alfeizar = "300003" // Alfeizar salon

  private fun createPlant(nickname: String, speciesId: String, locationId: String = invernadero) {
    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to speciesId)),
    ).andExpect(status().isCreated)
  }

  private fun list(sort: String?, vararg extra: Pair<String, String>) =
    mockMvc.perform(
      get("/plants").apply {
        if (sort != null) param("sort", sort)
        extra.forEach { (name, value) -> param(name, value) }
      },
    )

  @Test
  fun `sorting by species is alphabetical by scientific name and not by identifier`() {
    clearPlants()
    // Por clave de FK (200001 < 200002 < 200003) saldría g, m, e; por nombre científico, e, g, m.
    createPlant("m", mammillaria)
    createPlant("g", grusonii)
    createPlant("e", echeveria)

    list("species,asc")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[*].nickname").value(contains("e", "g", "m")))
  }

  @Test
  fun `sorting by location is by name, in either direction`() {
    clearPlants()
    createPlant("a", grusonii, invernadero) // "Invernadero 1"
    createPlant("b", grusonii, bandeja) // "Bandeja A3"
    createPlant("c", grusonii, alfeizar) // "Alfeizar salon"

    list("location,desc").andExpect(jsonPath("$.content[*].nickname").value(contains("a", "b", "c")))
    list("location,asc").andExpect(jsonPath("$.content[*].nickname").value(contains("c", "b", "a")))
  }

  @Test
  fun `sorting by nickname and by code works`() {
    clearPlants()
    createPlant("zeta", grusonii)
    createPlant("alfa", grusonii)

    list("nickname,asc").andExpect(jsonPath("$.content[*].nickname").value(contains("alfa", "zeta")))
    list("code,desc").andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS-02"))
  }

  @Test
  fun `the order is stable across pages when many plants share the species`() {
    clearPlants()
    repeat(9) { createPlant("p$it", grusonii) }
    repeat(3) { createPlant("q$it", mammillaria) }

    val codes = (0..3).flatMap { page ->
      val body = list("species,asc", "size" to "3", "page" to page.toString())
        .andExpect(status().isOk)
        .andReturn().response.contentAsString
      objectMapper.readTree(body)["content"].map { it["code"].asText() }
    }

    // Ni se repite ni se pierde ninguno entre una página y la siguiente.
    kotlin.test.assertEquals(12, codes.size)
    kotlin.test.assertEquals(12, codes.toSet().size)
  }

  @Test
  fun `without sort the default order is unchanged`() {
    clearPlants()
    createPlant("primera", grusonii)
    createPlant("segunda", mammillaria)

    list(null).andExpect(jsonPath("$.content[*].nickname").value(contains("primera", "segunda")))
  }

  @Test
  fun `a key that is not public is a 400 and runs no sorted query`() {
    list("tagSet,asc").andExpect(status().isBadRequest)
    list("password,asc").andExpect(status().isBadRequest)
    list("id,asc").andExpect(status().isBadRequest)
  }

  @Test
  fun `last review is not a key until the timeline and the alerts serve it`() {
    list("lastReview,desc").andExpect(status().isBadRequest)
    list("attention,desc").andExpect(status().isBadRequest)
  }

  @Test
  fun `an invalid direction is a 400`() {
    list("code,sideways").andExpect(status().isBadRequest)
  }

  @Test
  fun `the 400 uses the uniform error body`() {
    list("tagSet,asc")
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.path").value("/plants"))
  }
}

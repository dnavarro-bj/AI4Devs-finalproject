package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.containsInAnyOrder
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de «Búsqueda de texto en el inventario», «Filtro del inventario por especie»,
 * «Filtro por características de cultivo» y «Un criterio de listado no admitido nunca es un 500».
 */
class PlantTextSearchApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001" // Echinocactus grusonii · Asiento de suegra · CAT-GRUSS
  private val mammillaria = "200002" // Mammillaria elongata · Cactus dedo de dama · CAT-MAMMI
  private val echeveria = "200003" // Echeveria elegans · Echeveria · CAT-ECHEV

  private fun createPlant(nickname: String, speciesId: String, locationId: String = "300001") {
    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to locationId, "speciesId" to speciesId)),
    ).andExpect(status().isCreated)
  }

  /** Dos grusonii, una mammillaria y una echeveria, con exposición y entorno en las especies. */
  private fun seed() {
    clearPlants()
    jdbcTemplate.update("UPDATE species SET sun_exposure = 'pleno_sol', environment = 'exterior' WHERE id = 200001")
    jdbcTemplate.update("UPDATE species SET sun_exposure = 'soleado', environment = 'ambos' WHERE id = 200002")
    jdbcTemplate.update("UPDATE species SET sun_exposure = NULL, environment = NULL WHERE id = 200003")
    createPlant("Asiento de suegra", grusonii)
    createPlant("Bola dorada", grusonii, "300002")
    createPlant("Bola blanca", mammillaria)
    createPlant("Rosa de piedra", echeveria)
  }

  private fun search(vararg params: Pair<String, String>) =
    mockMvc.perform(get("/plants").apply { params.forEach { (name, value) -> param(name, value) } })

  // --- q ---

  @Test
  fun `q finds by nickname`() {
    seed()

    search("q" to "dorada")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].nickname").value("Bola dorada"))
  }

  @Test
  fun `q finds by the scientific name of the species even if nickname and code do not contain it`() {
    seed()

    search("q" to "grusonii")
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Asiento de suegra", "Bola dorada")))
  }

  @Test
  fun `q matches the plant if any of the four fields contains it`() {
    seed()

    // «suegra» es el apodo de una grusonii y el nombre común de su especie: salen las dos.
    search("q" to "suegra")
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Asiento de suegra", "Bola dorada")))
  }

  @Test
  fun `q finds by the common name of the species`() {
    seed()

    search("q" to "dedo de dama")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].nickname").value("Bola blanca"))
  }

  @Test
  fun `q finds by code`() {
    seed()

    search("q" to "gruss-01")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS-01"))
  }

  @Test
  fun `q does not care about case`() {
    seed()

    search("q" to "DORADA").andExpect(jsonPath("$.totalElements").value(1))
    search("q" to "dorada").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the wildcards of q are literal text`() {
    seed()

    search("q" to "%").andExpect(jsonPath("$.totalElements").value(0))
    search("q" to "_").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a blank q does not filter`() {
    seed()

    search("q" to "  ").andExpect(jsonPath("$.totalElements").value(4))
    search("q" to "").andExpect(jsonPath("$.totalElements").value(4))
  }

  @Test
  fun `q combines with the other filters`() {
    seed()

    search("q" to "grusonii", "location" to "300002")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].nickname").value("Bola dorada"))
  }

  @Test
  fun `the totals of a q search are those of the filter, across pages`() {
    seed()

    search("q" to "grusonii", "size" to "1")
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.content.length()").value(1))
  }

  @Test
  fun `q with no match is an empty page and not an error`() {
    seed()

    search("q" to "no-existe")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the code parameter keeps working`() {
    seed()

    search("code" to "mammi").andExpect(jsonPath("$.totalElements").value(1))
  }

  // --- species ---

  @Test
  fun `one species`() {
    seed()

    search("species" to grusonii)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Asiento de suegra", "Bola dorada")))
  }

  @Test
  fun `several species are an OR`() {
    seed()

    search("species" to grusonii, "species" to echeveria)
      .andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `a species that does not exist is an empty page`() {
    seed()

    search("species" to "999999999")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a malformed species identifier is a 400`() {
    search("species" to "abc").andExpect(status().isBadRequest)
  }

  // --- exposure y environment, de la especie ---

  @Test
  fun `exposure filters by the exposure of the species of the plant`() {
    seed()

    search("exposure" to "pleno_sol")
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].nickname").value(containsInAnyOrder("Asiento de suegra", "Bola dorada")))
  }

  @Test
  fun `several exposures are an OR`() {
    seed()

    search("exposure" to "soleado", "exposure" to "pleno_sol").andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `a species with no exposure defined matches no concrete value`() {
    seed()

    search("exposure" to "soleado")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].nickname").value("Bola blanca"))
  }

  @Test
  fun `environment filters by the environment of the species`() {
    seed()

    search("environment" to "ambos")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].nickname").value("Bola blanca"))
  }

  @Test
  fun `exposure and environment combine with each other and with q`() {
    seed()

    search("exposure" to "pleno_sol", "environment" to "exterior", "q" to "dorada")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[*].nickname").value(contains("Bola dorada")))
  }

  @Test
  fun `a value outside the enumeration is a 400`() {
    search("environment" to "playa").andExpect(status().isBadRequest)
    search("exposure" to "radiante").andExpect(status().isBadRequest)
  }

  // --- nunca un 500 ---

  @Test
  fun `an unknown status is a 400`() {
    search("status" to "resucitada")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.path").value("/plants"))
  }
}

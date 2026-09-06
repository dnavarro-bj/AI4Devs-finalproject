package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios del catálogo de mezclas de tierra (historia 0.8): alta, listado, ficha, corrección y
 * retirada. Es el primer API que tiene esta entidad, que llevaba desde T-01 solo en el esquema.
 */
class SoilMixApiTest : AbstractApiIntegrationTest() {

  @Test
  fun `a soil mix is registered with its recipe`() {
    mockMvc.perform(
      post("/soil-mixes")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Mezcla de prueba")),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.name").value("Mezcla de prueba"))
      .andExpect(jsonPath("$.organicPercentage").value(30))
      .andExpect(jsonPath("$.mineralPercentage").value(70))
      .andExpect(jsonPath("$.description").value("akadama, pómez, turba"))
  }

  @Test
  fun `the identifier travels as a decimal string, never as a number`() {
    val id = createSoilMix("Mezcla identificada")

    mockMvc.perform(get("/soil-mixes/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").isString)
  }

  @Test
  fun `the catalog lists the registered mixes, paginated`() {
    clearSoilMixes()
    listOf("Turba y perlita", "Akadama", "Pómez y arena").forEach { createSoilMix(it) }

    mockMvc.perform(get("/soil-mixes"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(
        jsonPath("$.content[*].name").value(hasItems("Akadama", "Pómez y arena", "Turba y perlita")),
      )
  }

  /** Sin orden estable, dos páginas consecutivas pueden repetir u omitir filas. */
  @Test
  fun `the listing is ordered by name when no sort is asked for`() {
    clearSoilMixes()
    listOf("Turba y perlita", "Akadama", "Pómez y arena").forEach { createSoilMix(it) }

    mockMvc.perform(get("/soil-mixes"))
      .andExpect(jsonPath("$.content[0].name").value("Akadama"))
      .andExpect(jsonPath("$.content[1].name").value("Pómez y arena"))
      .andExpect(jsonPath("$.content[2].name").value("Turba y perlita"))
  }

  @Test
  fun `the detail of a mix says how many species recommend it`() {
    clearSpecies()
    val id = createSoilMix("Mezcla consultada")
    createSpecies("Echinopsis oxygona", id)
    createSpecies("Gymnocalycium mihanovichii", id)

    mockMvc.perform(get("/soil-mixes/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.name").value("Mezcla consultada"))
      .andExpect(jsonPath("$.speciesCount").value(2))
  }

  /** Cero especies es un dato, no una ausencia: la ficha lo dice para poder retirarla. */
  @Test
  fun `a mix nobody recommends reports zero species`() {
    val id = createSoilMix("Mezcla sin uso")

    mockMvc.perform(get("/soil-mixes/$id"))
      .andExpect(jsonPath("$.speciesCount").value(0))
  }

  @Test
  fun `a mix is corrected as a whole`() {
    val id = createSoilMix("Mezcla por corregir")

    mockMvc.perform(
      put("/soil-mixes/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Mezcla corregida", organic = 40, mineral = 60)),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.name").value("Mezcla corregida"))
      .andExpect(jsonPath("$.organicPercentage").value(40))
      .andExpect(jsonPath("$.mineralPercentage").value(60))

    mockMvc.perform(get("/soil-mixes/$id"))
      .andExpect(jsonPath("$.name").value("Mezcla corregida"))
  }

  @Test
  fun `a mix nobody recommends is withdrawn from the catalog`() {
    val id = createSoilMix("Mezcla efímera")

    mockMvc.perform(delete("/soil-mixes/$id")).andExpect(status().isNoContent)

    mockMvc.perform(get("/soil-mixes/$id")).andExpect(status().isNotFound)
  }

  private fun recipe(
    name: String,
    organic: Int = 30,
    mineral: Int = 70,
    phMin: String = "5.5",
    phMax: String = "6.5",
    description: String? = "akadama, pómez, turba",
  ) = json(
    "name" to name,
    "organicPercentage" to organic,
    "mineralPercentage" to mineral,
    "phMin" to phMin,
    "phMax" to phMax,
    "description" to description,
  )

  private fun createSoilMix(name: String): String {
    val body = mockMvc.perform(
      post("/soil-mixes").contentType(MediaType.APPLICATION_JSON).content(recipe(name)),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(body).get("id").asText()
  }

  private fun createSpecies(scientificName: String, soilMixId: String) {
    mockMvc.perform(
      post("/species").contentType(MediaType.APPLICATION_JSON).content(
        json(
          "scientificName" to scientificName,
          "commonName" to "Especie de prueba",
          "minHumidity" to 10,
          "maxHumidity" to 30,
          "minTemperature" to 10,
          "maxTemperature" to 35,
          "minLightHours" to 6,
          "maxLightHours" to 10,
          "wateringGuideline" to "cada 10 dias",
          "soilMixId" to soilMixId,
        ),
      ),
    ).andExpect(status().isCreated)
  }

  /** Exige que no queden especies: `species.soil_mix_id` es `NOT NULL` y no tiene `ON DELETE`. */
  private fun clearSoilMixes() {
    clearSpecies()
    jdbcTemplate.update("DELETE FROM soil_mix")
  }
}

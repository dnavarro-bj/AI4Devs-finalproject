package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/**
 * Escenarios de «Código de una especie», «Corrección del código de una especie mientras no tenga
 * ejemplares» y «Ejemplares de una especie en su ficha».
 */
class SpeciesCodeApiTest : AbstractApiIntegrationTest() {

  private val soilMixId = "100001"
  private val grusoniiId = "200001"

  private fun body(code: String?, scientificName: String = "Mammillaria bocasana"): String {
    val pairs = mutableListOf<Pair<String, Any?>>(
      "scientificName" to scientificName,
      "commonName" to "Biznaga de lana",
      "minHumidity" to 15,
      "maxHumidity" to 40,
      "minTemperature" to 5,
      "maxTemperature" to 34,
      "minLightHours" to 5,
      "maxLightHours" to 9,
      "wateringGuideline" to "cada 10-18 dias",
      "soilMixId" to soilMixId,
    )
    if (code != null) pairs.add("code" to code)
    return json(*pairs.toTypedArray())
  }

  private fun create(code: String?, scientificName: String = "Mammillaria bocasana"): ResultActions =
    mockMvc.perform(post("/species").contentType(MediaType.APPLICATION_JSON).content(body(code, scientificName)))

  private fun update(id: String, code: String?, scientificName: String = "Mammillaria bocasana"): ResultActions =
    mockMvc.perform(put("/species/$id").contentType(MediaType.APPLICATION_JSON).content(body(code, scientificName)))

  private fun createPlant(speciesId: String): String {
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to "300001", "speciesId" to speciesId)),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun createdId(result: ResultActions): String =
    objectMapper.readTree(result.andReturn().response.contentAsString).get("id").asText()

  // --- Código de una especie ---

  @Test
  fun `a code is normalized to uppercase and trimmed`() {
    create(" cat-gruss2 ")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.code").value("CAT-GRUSS2"))
  }

  @Test
  fun `a species without a code is rejected with 400 and none is created`() {
    clearSpecies()

    create(null)
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(containsString("código")))

    mockMvc.perform(get("/species")).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a blank code is rejected with 400`() {
    create("   ")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("código")))
  }

  @Test
  fun `a code already used answers 409 and creates nothing`() {
    create("CAT-GRUSS", "Mammillaria bocasana")
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.message").value(containsString("código")))
  }

  @Test
  fun `a code already used with different capitalization also answers 409`() {
    create("cat-gruss", "Mammillaria bocasana").andExpect(status().isConflict)
  }

  @Test
  fun `a code with an invalid format answers 400, not 500`() {
    for (invalid in listOf("CAT GRUSS", "CAT_GRUSS", "-CAT", "CAT-", "A".repeat(21))) {
      create(invalid, "Especie $invalid")
        .andExpect(status().isBadRequest)
        .andExpect(jsonPath("$.status").value(400))
    }
  }

  @Test
  fun `the code travels in the catalog listing and in the record`() {
    mockMvc.perform(get("/species"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[?(@.id == '$grusoniiId')].code").value("CAT-GRUSS"))
    mockMvc.perform(get("/species/$grusoniiId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.code").value("CAT-GRUSS"))
  }

  // --- Corrección ---

  @Test
  fun `a code can be corrected while the species has no plants`() {
    clearPlants()
    val id = createdId(create("TEST-VIEJO", "Mammillaria bocasana"))

    update(id, "TEST-NUEVO")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.code").value("TEST-NUEVO"))

    mockMvc.perform(get("/species/$id")).andExpect(jsonPath("$.code").value("TEST-NUEVO"))
  }

  @Test
  fun `a code cannot change once the species has plants`() {
    clearPlants()
    createPlant(grusoniiId)

    update(grusoniiId, "CAT-OTRO", "Echinocactus grusonii")
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.message").value(containsString("ejemplares")))

    mockMvc.perform(get("/species/$grusoniiId")).andExpect(jsonPath("$.code").value("CAT-GRUSS"))
  }

  @Test
  fun `sending the same code with plants is accepted and the rest of the record changes`() {
    clearPlants()
    createPlant(grusoniiId)

    update(grusoniiId, "CAT-GRUSS", "Echinocactus grusonii")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.code").value("CAT-GRUSS"))
      .andExpect(jsonPath("$.commonName").value("Biznaga de lana"))
  }

  @Test
  fun `updating without a code answers 400 and keeps the species as it was`() {
    update(grusoniiId, null, "Echinocactus grusonii")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("código")))

    mockMvc.perform(get("/species/$grusoniiId"))
      .andExpect(jsonPath("$.code").value("CAT-GRUSS"))
      .andExpect(jsonPath("$.commonName").value("Asiento de suegra"))
  }

  @Test
  fun `a new code already used by another species answers 409 and keeps the old one`() {
    clearPlants()
    val id = createdId(create("TEST-VIEJO", "Mammillaria bocasana"))

    update(id, "CAT-GRUSS").andExpect(status().isConflict)

    mockMvc.perform(get("/species/$id")).andExpect(jsonPath("$.code").value("TEST-VIEJO"))
  }

  @Test
  fun `correcting the code of a species without plants gives the next plant the new code`() {
    clearPlants()
    val id = createdId(create("CAT-VIEJO", "Mammillaria bocasana"))
    update(id, "CAT-NUEVO").andExpect(status().isOk)

    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to "300001", "speciesId" to id)),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.code").value("CAT-NUEVO-01"))
  }

  // --- Ejemplares en la ficha ---

  @Test
  fun `the record counts the plants of the species`() {
    clearPlants()
    repeat(3) { createPlant(grusoniiId) }

    mockMvc.perform(get("/species/$grusoniiId")).andExpect(jsonPath("$.plantCount").value(3))
  }

  @Test
  fun `a species without plants reports zero, not an omission`() {
    clearPlants()

    mockMvc.perform(get("/species/$grusoniiId")).andExpect(jsonPath("$.plantCount").value(0))
  }

  @Test
  fun `the plant detail does not carry the species counter`() {
    clearPlants()
    val id = createPlant(grusoniiId)

    mockMvc.perform(get("/plants/$id"))
      .andExpect(jsonPath("$.species.plantCount").doesNotExist())
      .andExpect(jsonPath("$.species.code").value("CAT-GRUSS"))
    assertEquals(1, countPlants())
  }

  private fun countPlants(): Int {
    flushPersistenceContext()
    return jdbcTemplate.queryForObject("SELECT count(*) FROM plant", Int::class.java)!!
  }
}

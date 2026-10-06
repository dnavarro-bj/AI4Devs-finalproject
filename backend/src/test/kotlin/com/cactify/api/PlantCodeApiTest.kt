package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Código de inventario de una planta» y «El código de un ejemplar es inmutable». */
class PlantCodeApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001" // CAT-GRUSS
  private val mammillaria = "200002" // CAT-MAMMI
  private val greenhouse = "300001"
  private val tray = "300002"

  private fun createPlant(speciesId: String, nickname: String = "Bola"): ResultActions =
    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to greenhouse, "speciesId" to speciesId)),
    )

  private fun created(speciesId: String): String {
    val response = createPlant(speciesId).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun codeOf(id: String): String =
    objectMapper.readTree(mockMvc.perform(get("/plants/$id")).andReturn().response.contentAsString).get("code").asText()

  // --- Asignación ---

  @Test
  fun `the first plant of a species gets number 01`() {
    clearPlants()

    createPlant(grusonii)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.code").value("CAT-GRUSS-01"))
  }

  @Test
  fun `consecutive plants of the same species get consecutive numbers`() {
    clearPlants()

    val codes = (1..3).map { codeOf(created(grusonii)) }

    kotlin.test.assertEquals(listOf("CAT-GRUSS-01", "CAT-GRUSS-02", "CAT-GRUSS-03"), codes)
  }

  @Test
  fun `each species has its own numbering`() {
    clearPlants()
    created(grusonii)
    created(grusonii)

    createPlant(mammillaria)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.code").value("CAT-MAMMI-01"))
  }

  @Test
  fun `the number grows beyond two digits`() {
    clearPlants()
    jdbcTemplate.update("UPDATE species SET next_sequence = 99 WHERE id = ?", grusonii.toLong())

    createPlant(grusonii).andExpect(jsonPath("$.code").value("CAT-GRUSS-99"))
    createPlant(grusonii).andExpect(jsonPath("$.code").value("CAT-GRUSS-100"))
  }

  @Test
  fun `the code travels in the detail and in the listing`() {
    clearPlants()
    val id = created(grusonii)

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.code").value("CAT-GRUSS-01"))
    mockMvc.perform(get("/plants"))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS-01"))
  }

  @Test
  fun `a rejected creation does not consume a number`() {
    clearPlants()
    created(grusonii)

    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "  ", "locationId" to greenhouse, "speciesId" to grusonii)),
    ).andExpect(status().isBadRequest)

    createPlant(grusonii).andExpect(jsonPath("$.code").value("CAT-GRUSS-02"))
  }

  // --- Inmutabilidad ---

  @Test
  fun `editing the nickname or the location keeps the code`() {
    clearPlants()
    val id = created(grusonii)

    mockMvc.perform(
      put("/plants/$id").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Otro", "locationId" to tray, "speciesId" to grusonii)),
    ).andExpect(status().isOk).andExpect(jsonPath("$.code").value("CAT-GRUSS-01"))

    kotlin.test.assertEquals("CAT-GRUSS-01", codeOf(id))
  }

  @Test
  fun `changing the species keeps the code and the next plant of the old species does not reuse it`() {
    clearPlants()
    val id = created(grusonii)

    mockMvc.perform(
      put("/plants/$id").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to greenhouse, "speciesId" to mammillaria)),
    ).andExpect(status().isOk).andExpect(jsonPath("$.code").value("CAT-GRUSS-01"))

    createPlant(grusonii).andExpect(jsonPath("$.code").value("CAT-GRUSS-02"))
    createPlant(mammillaria).andExpect(jsonPath("$.code").value("CAT-MAMMI-01"))
  }

  @Test
  fun `a code sent in the body of an edit is ignored`() {
    clearPlants()
    val id = created(grusonii)

    mockMvc.perform(
      put("/plants/$id").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to greenhouse, "speciesId" to grusonii, "code" to "CAT-OTRO-99")),
    ).andExpect(status().isOk).andExpect(jsonPath("$.code").value("CAT-GRUSS-01"))
  }

  @Test
  fun `a code sent in the body of a creation is ignored`() {
    clearPlants()

    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to greenhouse, "speciesId" to grusonii, "code" to "CAT-OTRO-99")),
    ).andExpect(status().isCreated).andExpect(jsonPath("$.code").value("CAT-GRUSS-01"))
  }
}

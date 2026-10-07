package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.CsvTestReader
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «La exportación no trunca en silencio», con el máximo en 4 filas. */
@TestPropertySource(properties = ["cactify.export.max-rows=4"])
class ExportLimitApiTest : AbstractApiIntegrationTest() {

  private fun createPlants(count: Int) {
    clearPlants()
    repeat(count) {
      mockMvc.perform(
        post("/plants").contentType(MediaType.APPLICATION_JSON)
          .content(json("nickname" to "Planta $it", "locationId" to "300001", "speciesId" to "200001")),
      ).andExpect(status().isCreated)
    }
  }

  @Test
  fun `a result above the maximum is a 422 that says how many rows and the maximum`() {
    createPlants(5)

    mockMvc.perform(get("/plants/export"))
      .andExpect(status().isUnprocessableEntity)
      .andExpect(jsonPath("$.status").value(422))
      .andExpect(jsonPath("$.message").value("5 filas superan el máximo de 4: afina los filtros"))
      .andExpect(jsonPath("$.path").value("/plants/export"))
  }

  @Test
  fun `no partial csv is returned`() {
    createPlants(5)

    val response = mockMvc.perform(get("/plants/export")).andReturn().response
    assertEquals(422, response.status)
    kotlin.test.assertFalse(response.contentType.orEmpty().contains("csv"))
  }

  @Test
  fun `exactly the maximum is exported in full`() {
    createPlants(4)

    val response = mockMvc.perform(get("/plants/export")).andExpect(status().isOk).andReturn().response
    assertEquals(5, CsvTestReader.read(response.contentAsByteArray).size)
  }

  @Test
  fun `a filter that brings the result under the maximum exports`() {
    createPlants(5)

    mockMvc.perform(get("/plants/export").param("q", "Planta 1")).andExpect(status().isOk)
  }

  @Test
  fun `the species export is bounded too`() {
    for (i in 1..5) {
      mockMvc.perform(
        post("/species").contentType(MediaType.APPLICATION_JSON).content(
          json(
            "code" to "CAT-EXP$i", "scientificName" to "Exportus numerus $i", "commonName" to "Exportable $i",
            "minHumidity" to 10, "maxHumidity" to 40, "minTemperature" to 5, "maxTemperature" to 30,
            "minLightHours" to 4, "maxLightHours" to 8, "wateringGuideline" to "cada 10 días", "soilMixId" to "100001",
          ),
        ),
      ).andExpect(status().isCreated)
    }

    mockMvc.perform(get("/species/export"))
      .andExpect(status().isUnprocessableEntity)
      .andExpect(jsonPath("$.message").value(containsString("superan el máximo de 4")))
    mockMvc.perform(get("/species/export").param("q", "numerus 1")).andExpect(status().isOk)
  }
}

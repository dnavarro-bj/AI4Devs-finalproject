package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.CsvTestReader
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Exportación del catálogo de especies filtrado». Las semillas son CAT-GRUSS, CAT-MAMMI y CAT-ECHEV. */
class SpeciesExportApiTest : AbstractApiIntegrationTest() {

  private val header = listOf(
    "Código", "Nombre científico", "Nombre común", "Exposición", "Entorno", "Mezcla de sustrato",
    "Temperatura mínima", "Temperatura máxima", "Humedad mínima", "Humedad máxima",
    "Horas de luz mínimas", "Horas de luz máximas", "Riego orientativo", "Ejemplares",
  )

  private fun export(vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(get("/species/export").apply { params.forEach { (k, v) -> param(k, v) } })

  private fun rows(actions: ResultActions): List<List<String>> =
    CsvTestReader.read(actions.andExpect(status().isOk).andReturn().response.contentAsByteArray)

  private fun createPlant(speciesId: String) {
    mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Planta", "locationId" to "300001", "speciesId" to speciesId)),
    ).andExpect(status().isCreated)
  }

  @Test
  fun `the response is a dated csv download with the fixed columns`() {
    export().andExpect(status().isOk)
      .andExpect(content().contentTypeCompatibleWith("text/csv"))
      .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("cactify-especies-")))

    assertEquals(header, rows(export()).first())
  }

  @Test
  fun `a group is exported with the same rows as its listing`() {
    val listed = objectMapper.readTree(
      mockMvc.perform(get("/species").param("minTemperatureFrom", "11")).andReturn().response.contentAsString,
    ).get("content").map { it.get("code").asText() }

    val csv = rows(export("minTemperatureFrom" to "11")).drop(1).map { it[0] }

    assertEquals(listOf("CAT-MAMMI"), listed)
    assertEquals(listed, csv)
  }

  @Test
  fun `the plant count is exported, zero included`() {
    clearPlants()
    createPlant("200001")
    createPlant("200001")

    val counts = rows(export()).drop(1).associate { it[0] to it[13] }
    assertEquals("2", counts["CAT-GRUSS"])
    assertEquals("0", counts["CAT-MAMMI"])
  }

  @Test
  fun `the row carries the species profile`() {
    val row = rows(export("q" to "grusonii")).drop(1).single()

    assertEquals("CAT-GRUSS", row[0])
    assertEquals("Echinocactus grusonii", row[1])
    assertEquals("Asiento de suegra", row[2])
    assertEquals(listOf("10", "35", "10", "30", "6", "10"), row.subList(6, 12))
  }

  @Test
  fun `a text starting with a formula sign is neutralized but the numbers are not`() {
    mockMvc.perform(
      post("/species").contentType(MediaType.APPLICATION_JSON).content(
        json(
          "code" to "CAT-FORM", "scientificName" to "Formulus ex", "commonName" to "=1+1",
          "minHumidity" to 10, "maxHumidity" to 40, "minTemperature" to -5, "maxTemperature" to 30,
          "minLightHours" to 4, "maxLightHours" to 8, "wateringGuideline" to "cada 10 días", "soilMixId" to "100001",
        ),
      ),
    ).andExpect(status().isCreated)

    val row = rows(export("q" to "formulus")).drop(1).single()
    assertEquals("'=1+1", row[2])
    assertEquals("-5", row[6])
  }

  @Test
  fun `an invalid filter is a 400`() {
    export("growthMonth" to "13").andExpect(status().isBadRequest)
    export("sort" to "periodRows,asc").andExpect(status().isBadRequest)
  }

  @Test
  fun `the requested order is respected`() {
    val names = rows(export("sort" to "scientificName,desc")).drop(1).map { it[1] }
    assertTrue(names.size >= 3)
    assertEquals(names.sortedDescending(), names)
  }
}

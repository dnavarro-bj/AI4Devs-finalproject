package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * La ficha de una especie devuelve la mezcla que recomienda.
 *
 * T-08 la dejó fuera a propósito, porque nadie la consumía. Ahora el editor de especie la
 * necesita: `PUT /species/{id}` es **reemplazo completo** y exige `soilMixId`, así que sin ella la
 * ficha no basta para reconstruir la especie y corregir el nombre común cambiaría la mezcla.
 */
class SpeciesSoilMixApiTest : AbstractApiIntegrationTest() {

  private val seededSoilMixId = "100001"
  private val otherSoilMixId = "100002"

  @Test
  fun `the detail of a species carries its soil mix, identified and named`() {
    val id = createSpecies("Astrophytum myriostigma", seededSoilMixId)

    mockMvc.perform(get("/species/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.soilMix.id").value(seededSoilMixId))
      .andExpect(jsonPath("$.soilMix.name").value("Sustrato mineral de drenaje rápido"))
  }

  /** Con identificador y no solo con nombre: el nombre pinta, el identificador vuelve a enviarse. */
  @Test
  fun `the soil mix identifier travels as a decimal string`() {
    val id = createSpecies("Ferocactus glaucescens", seededSoilMixId)

    mockMvc.perform(get("/species/$id"))
      .andExpect(jsonPath("$.soilMix.id").isString)
  }

  /**
   * El escenario que motivó el cambio: reenviar la ficha tal cual como corrección no puede
   * perder la mezcla.
   */
  @Test
  fun `sending the detail back as a correction keeps the soil mix it had`() {
    val id = createSpecies("Gymnocalycium mihanovichii", otherSoilMixId)
    val detail = objectMapper.readTree(
      mockMvc.perform(get("/species/$id")).andReturn().response.contentAsString,
    )

    mockMvc.perform(
      put("/species/$id").contentType(MediaType.APPLICATION_JSON).content(
        json(
          "scientificName" to detail.get("scientificName").asText(),
          "commonName" to "Nombre común corregido",
          "minHumidity" to detail.get("minHumidity").asInt(),
          "maxHumidity" to detail.get("maxHumidity").asInt(),
          "minTemperature" to detail.get("minTemperature").asInt(),
          "maxTemperature" to detail.get("maxTemperature").asInt(),
          "minLightHours" to detail.get("minLightHours").asInt(),
          "maxLightHours" to detail.get("maxLightHours").asInt(),
          "wateringGuideline" to detail.get("wateringGuideline").asText(),
          "soilMixId" to detail.get("soilMix").get("id").asText(),
        ),
      ),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.commonName").value("Nombre común corregido"))
      .andExpect(jsonPath("$.soilMix.id").value(otherSoilMixId))
  }

  /** `PlantDetailResponse` anida la ficha de la especie, así que la hereda. */
  @Test
  fun `the plant detail carries the soil mix of its species too`() {
    val speciesId = createSpecies("Echinopsis oxygona", seededSoilMixId)
    val plantId = createPlant("Bola con sustrato", speciesId)

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.species.soilMix.id").value(seededSoilMixId))
  }

  private fun createSpecies(scientificName: String, soilMixId: String): String {
    val body = mockMvc.perform(
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
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(body).get("id").asText()
  }

  private fun createPlant(nickname: String, speciesId: String): String {
    val body = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON).content(
        json("nickname" to nickname, "locationId" to "300001", "speciesId" to speciesId),
      ),
    )
      .andExpect(status().isCreated)
      .andReturn().response.contentAsString
    return objectMapper.readTree(body).get("id").asText()
  }
}

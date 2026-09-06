package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Los caminos de error del catálogo de mezclas. Ninguno puede ser un `500`: una composición que no
 * cuadra es un dato inválido del cliente, y una mezcla en uso es un conflicto previsible.
 */
class SoilMixErrorApiTest : AbstractApiIntegrationTest() {

  private val unknownId = "999999999"

  @Test
  fun `a composition that does not add up to 100 is a bad request, not a server error`() {
    mockMvc.perform(
      post("/soil-mixes")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Mezcla imposible", organic = 30, mineral = 40)),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").value(containsString("100")))
      .andExpect(jsonPath("$.path").value("/soil-mixes"))
  }

  @Test
  fun `a pH outside the scale is a bad request`() {
    mockMvc.perform(
      post("/soil-mixes")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Mezcla corrosiva", phMin = "0.5", phMax = "15.0")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("pH")))
  }

  @Test
  fun `an inverted pH range is a bad request`() {
    mockMvc.perform(
      post("/soil-mixes")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Mezcla invertida", phMin = "7.0", phMax = "6.0")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("no puede superar")))
  }

  @Test
  fun `a blank name is a bad request`() {
    mockMvc.perform(
      post("/soil-mixes").contentType(MediaType.APPLICATION_JSON).content(recipe(name = "   ")),
    )
      .andExpect(status().isBadRequest)
  }

  /** La corrección pasa por las mismas reglas que el alta: el `PUT` es reemplazo completo. */
  @Test
  fun `a correction that breaks the composition is rejected and the mix stays as it was`() {
    val id = createSoilMix("Mezcla intacta")

    mockMvc.perform(
      put("/soil-mixes/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Mezcla rota", organic = 10, mineral = 10)),
    )
      .andExpect(status().isBadRequest)

    mockMvc.perform(get("/soil-mixes/$id"))
      .andExpect(jsonPath("$.name").value("Mezcla intacta"))
      .andExpect(jsonPath("$.organicPercentage").value(30))
  }

  @Test
  fun `an unknown mix is not found in detail, correction and withdrawal`() {
    mockMvc.perform(get("/soil-mixes/$unknownId"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.message").value(containsString(unknownId)))

    mockMvc.perform(
      put("/soil-mixes/$unknownId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(recipe(name = "Da igual")),
    )
      .andExpect(status().isNotFound)

    mockMvc.perform(delete("/soil-mixes/$unknownId")).andExpect(status().isNotFound)
  }

  @Test
  fun `an identifier that is not a decimal string is a bad request, never a server error`() {
    mockMvc.perform(get("/soil-mixes/no-soy-un-id"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  /**
   * El escenario que justifica comprobar el uso **antes** de borrar: dejar que lo rechazara la
   * clave foránea convertiría un caso previsible en un `500`.
   */
  @Test
  fun `a mix recommended by some species cannot be withdrawn, and survives the attempt`() {
    clearSpecies()
    val id = createSoilMix("Mezcla en uso")
    createSpecies("Echinopsis oxygona", id)

    mockMvc.perform(delete("/soil-mixes/$id"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.message").value(containsString("no se puede eliminar")))

    mockMvc.perform(get("/soil-mixes/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.speciesCount").value(1))
  }

  private fun recipe(
    name: String,
    organic: Int = 30,
    mineral: Int = 70,
    phMin: String = "5.5",
    phMax: String = "6.5",
  ) = json(
    "name" to name,
    "organicPercentage" to organic,
    "mineralPercentage" to mineral,
    "phMin" to phMin,
    "phMax" to phMax,
    "description" to null,
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
}

package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.hamcrest.Matchers.instanceOf
import org.hamcrest.Matchers.not
import kotlin.test.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios del listado, su paginación y la ficha de una especie. */
class SpeciesApiTest : AbstractApiIntegrationTest() {

  private val defaultPageSize = 25
  private val maxPageSize = 500
  private val seededSoilMixId = 100001L

  @Test
  fun `the catalog lists the registered species`() {
    clearSpecies()
    insertSpecies("Echinocactus grusonii", commonName = "Asiento de suegra")
    insertSpecies("Mammillaria elongata", commonName = "Cactus dedo de dama")

    mockMvc.perform(get("/species"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(
        jsonPath("$.content[*].scientificName")
          .value(hasItems("Echinocactus grusonii", "Mammillaria elongata")),
      )
      .andExpect(
        jsonPath("$.content[*].commonName")
          .value(hasItems("Asiento de suegra", "Cactus dedo de dama")),
      )
      .andExpect(jsonPath("$.content[0].id").isNotEmpty)
  }

  @Test
  fun `the listing is ordered by scientific name when no sort is asked for`() {
    clearSpecies()
    listOf("Mammillaria elongata", "Astrophytum myriostigma", "Ferocactus glaucescens")
      .forEach { insertSpecies(it) }

    mockMvc.perform(get("/species"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].scientificName").value("Astrophytum myriostigma"))
      .andExpect(jsonPath("$.content[1].scientificName").value("Ferocactus glaucescens"))
      .andExpect(jsonPath("$.content[2].scientificName").value("Mammillaria elongata"))
  }

  /** ADR-008: un TSID supera `2^53` y como número JSON el cliente lo redondearía en silencio. */
  @Test
  fun `identifiers travel as decimal strings, never as JSON numbers`() {
    mockMvc.perform(get("/species"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[0].id").value(instanceOf<Any>(String::class.java)))
  }

  @Test
  fun `a listing without page or size returns the first page with the configured default size`() {
    mockMvc.perform(get("/species"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(defaultPageSize))
      .andExpect(jsonPath("$.totalElements").isNumber)
      .andExpect(jsonPath("$.totalPages").isNumber)
  }

  @Test
  fun `5 species with page size 2 answer 2 elements, 5 total and 3 pages`() {
    clearSpecies()
    repeat(5) { insertSpecies("Especie de prueba $it") }

    mockMvc.perform(get("/species").param("page", "0").param("size", "2"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content.length()").value(2))
      .andExpect(jsonPath("$.totalElements").value(5))
      .andExpect(jsonPath("$.totalPages").value(3))
      .andExpect(jsonPath("$.pageNumber").value(0))
      .andExpect(jsonPath("$.pageSize").value(2))
  }

  @Test
  fun `a size above the configured maximum is trimmed to the maximum`() {
    mockMvc.perform(get("/species").param("size", "1000"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.pageSize").value(maxPageSize))
  }

  @Test
  fun `the sheet of an existing species carries its ranges and watering guideline`() {
    val id = insertSpecies(
      "Ferocactus glaucescens",
      commonName = "Biznaga azul",
      minHumidity = 12,
      maxHumidity = 32,
      minTemperature = 8,
      maxTemperature = 34,
      minLightHours = 5,
      maxLightHours = 11,
      wateringGuideline = "cada 15 dias en crecimiento",
    )

    mockMvc.perform(get("/species/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(id.toString()))
      .andExpect(jsonPath("$.scientificName").value("Ferocactus glaucescens"))
      .andExpect(jsonPath("$.commonName").value("Biznaga azul"))
      .andExpect(jsonPath("$.minHumidity").value(12))
      .andExpect(jsonPath("$.maxHumidity").value(32))
      .andExpect(jsonPath("$.minTemperature").value(8))
      .andExpect(jsonPath("$.maxTemperature").value(34))
      .andExpect(jsonPath("$.minLightHours").value(5))
      .andExpect(jsonPath("$.maxLightHours").value(11))
      .andExpect(jsonPath("$.wateringGuideline").value("cada 15 dias en crecimiento"))
  }

  @Test
  fun `the sheet of a species that does not exist is a 404 with the uniform error body`() {
    mockMvc.perform(get("/species/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.error").value("Not Found"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/species/999999999"))
  }

  @Test
  fun `a malformed identifier is a 400, never a 500`() {
    mockMvc.perform(get("/species/no-es-un-id"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  @Test
  fun `a species is created correctly`() {
    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody()),
    )
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.scientificName").value("Ferocactus glaucescens"))
      .andExpect(jsonPath("$.commonName").value("Biznaga azul"))
      .andExpect(jsonPath("$.minHumidity").value(10))
      .andExpect(jsonPath("$.maxHumidity").value(30))
      .andExpect(jsonPath("$.minTemperature").value(12))
      .andExpect(jsonPath("$.maxTemperature").value(35))
      .andExpect(jsonPath("$.minLightHours").value(6))
      .andExpect(jsonPath("$.maxLightHours").value(10))
      .andExpect(jsonPath("$.wateringGuideline").value("cada 15 dias en crecimiento"))
  }

  @Test
  fun `a species just created shows up in the catalog`() {
    createSpecies(speciesBody(scientificName = "Astrophytum capricorne"))

    mockMvc.perform(get("/species").param("size", "500"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[*].scientificName").value(hasItems("Astrophytum capricorne")))
  }

  @Test
  fun `a species without a scientific name is rejected with 400 and none is created`() {
    val before = countSpecies()

    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(scientificName = "   ")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    assertEquals(before, countSpecies(), "no debía crearse ninguna especie")
  }

  @Test
  fun `a species without a watering guideline is rejected with 400`() {
    val before = countSpecies()

    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(wateringGuideline = "  ")),
    )
      .andExpect(status().isBadRequest)

    assertEquals(before, countSpecies(), "no debía crearse ninguna especie")
  }

  @Test
  fun `an inverted humidity range is rejected with 400 and none is created`() {
    val before = countSpecies()

    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(minHumidity = 40, maxHumidity = 20)),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    assertEquals(before, countSpecies(), "no debía crearse ninguna especie")
  }

  @Test
  fun `a soil mix that does not exist is a 400, not a 404 nor a 500`() {
    val before = countSpecies()

    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(soilMixId = "999999999")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    assertEquals(before, countSpecies(), "no debía crearse ninguna especie")
  }

  @Test
  fun `a missing soil mix is rejected with 400`() {
    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(soilMixId = null)),
    )
      .andExpect(status().isBadRequest)
  }

  /** ADR-008: `SoilMixId.from(...)` lanza `NumberFormatException`, y el handler la baja a 400. */
  @Test
  fun `a malformed soil mix identifier is rejected with 400`() {
    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(soilMixId = "no-es-un-id")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  @Test
  fun `a second species with an existing scientific name is rejected with 409`() {
    clearSpecies()
    createSpecies(speciesBody(scientificName = "Echinocactus grusonii"))

    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(scientificName = "Echinocactus grusonii", commonName = "Otro nombre")),
    )
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.error").value("Conflict"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/species"))

    assertEquals(
      1,
      jdbcTemplate.queryForObject(
        "SELECT count(*) FROM species WHERE scientific_name = 'Echinocactus grusonii'",
        Int::class.java,
      ),
    )
  }

  @Test
  fun `a species is updated correctly and its sheet reflects the new values`() {
    val id = insertSpecies("Echinopsis oxygona")

    mockMvc.perform(
      put("/species/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
          speciesBody(
            scientificName = "Echinopsis oxygona",
            commonName = "Cactus de Pascua",
            minHumidity = 15,
            maxHumidity = 35,
            minTemperature = 8,
            maxTemperature = 30,
            minLightHours = 5,
            maxLightHours = 9,
            wateringGuideline = "cada 20 dias en crecimiento",
          ),
        ),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(id.toString()))
      .andExpect(jsonPath("$.commonName").value("Cactus de Pascua"))
      .andExpect(jsonPath("$.minHumidity").value(15))
      .andExpect(jsonPath("$.maxHumidity").value(35))
      .andExpect(jsonPath("$.wateringGuideline").value("cada 20 dias en crecimiento"))

    mockMvc.perform(get("/species/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.minHumidity").value(15))
      .andExpect(jsonPath("$.maxHumidity").value(35))
      .andExpect(jsonPath("$.minTemperature").value(8))
      .andExpect(jsonPath("$.maxTemperature").value(30))
      .andExpect(jsonPath("$.minLightHours").value(5))
      .andExpect(jsonPath("$.maxLightHours").value(9))
  }

  @Test
  fun `repeating the same update leaves the species in the same state`() {
    val id = insertSpecies("Echinopsis oxygona")
    val body = speciesBody(scientificName = "Echinopsis oxygona", minHumidity = 18, maxHumidity = 38)

    repeat(2) {
      mockMvc.perform(put("/species/$id").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.minHumidity").value(18))
        .andExpect(jsonPath("$.maxHumidity").value(38))
    }
  }

  @Test
  fun `updating a species that does not exist is a 404`() {
    mockMvc.perform(
      put("/species/999999999").contentType(MediaType.APPLICATION_JSON).content(speciesBody()),
    )
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  @Test
  fun `an update with invalid data is a 400 and the species keeps its previous values`() {
    val id = insertSpecies("Echinopsis oxygona", minTemperature = 10, maxTemperature = 35)

    mockMvc.perform(
      put("/species/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
          speciesBody(scientificName = "Echinopsis oxygona", minTemperature = 30, maxTemperature = 10),
        ),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))

    mockMvc.perform(
      put("/species/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(scientificName = "Echinopsis oxygona", commonName = "  ")),
    )
      .andExpect(status().isBadRequest)

    mockMvc.perform(get("/species/$id"))
      .andExpect(jsonPath("$.minTemperature").value(10))
      .andExpect(jsonPath("$.maxTemperature").value(35))
  }

  @Test
  fun `renaming a species to another species scientific name is rejected with 409`() {
    clearSpecies()
    insertSpecies("Echinocactus grusonii")
    val id = insertSpecies("Mammillaria elongata")

    mockMvc.perform(
      put("/species/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(speciesBody(scientificName = "Echinocactus grusonii")),
    )
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))

    mockMvc.perform(get("/species/$id"))
      .andExpect(jsonPath("$.scientificName").value("Mammillaria elongata"))
  }

  @Test
  fun `an update that keeps the species own scientific name is accepted`() {
    val id = insertSpecies("Gymnocalycium mihanovichii")

    mockMvc.perform(
      put("/species/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
          speciesBody(
            scientificName = "Gymnocalycium mihanovichii",
            wateringGuideline = "cada 25 dias",
          ),
        ),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.scientificName").value("Gymnocalycium mihanovichii"))
      .andExpect(jsonPath("$.wateringGuideline").value("cada 25 dias"))
  }

  /**
   * Criterio 4 de la historia 0.6: al actualizar la ficha, los ejemplares reciben el cambio.
   * `Plant` no tiene campos de cuidados propios —lee los de su especie—, así que la propagación
   * es automática mientras la historia 0.7 no introduzca los overrides.
   */
  @Test
  fun `a plant reflects the updated sheet of its species`() {
    val speciesId = insertSpecies("Echinocereus rigidissimus", minHumidity = 10, maxHumidity = 30)
    val plantId = createPlant(speciesId)

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(jsonPath("$.species.minHumidity").value(10))
      .andExpect(jsonPath("$.species.maxHumidity").value(30))

    mockMvc.perform(
      put("/species/$speciesId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
          speciesBody(scientificName = "Echinocereus rigidissimus", minHumidity = 20, maxHumidity = 40),
        ),
    ).andExpect(status().isOk)

    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.species.minHumidity").value(20))
      .andExpect(jsonPath("$.species.maxHumidity").value(40))
  }

  private fun createPlant(speciesId: Long): String {
    val locationId = jdbcTemplate.queryForObject("SELECT id FROM location LIMIT 1", Long::class.java)
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
          json(
            "nickname" to "Ejemplar de prueba",
            "locationId" to locationId.toString(),
            "speciesId" to speciesId.toString(),
          ),
        ),
    )
      .andExpect(status().isCreated)
      .andReturn()
      .response
      .contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  @Test
  fun `a species with no plants is deleted and disappears from the catalog`() {
    val id = insertSpecies("Rebutia heliosa")

    mockMvc.perform(delete("/species/$id")).andExpect(status().isNoContent)

    mockMvc.perform(get("/species/$id")).andExpect(status().isNotFound)
    mockMvc.perform(get("/species").param("size", "500"))
      .andExpect(jsonPath("$.content[*].scientificName").value(not(hasItems("Rebutia heliosa"))))
  }

  @Test
  fun `deleting a species that does not exist is a 404`() {
    mockMvc.perform(delete("/species/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  @Test
  fun `deleting a species that has plants is a 409 and touches nothing`() {
    val speciesId = insertSpecies("Parodia magnifica")
    val plantId = createPlant(speciesId)

    mockMvc.perform(delete("/species/$speciesId"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.error").value("Conflict"))
      .andExpect(jsonPath("$.message").isNotEmpty)
      .andExpect(jsonPath("$.path").value("/species/$speciesId"))

    mockMvc.perform(get("/species/$speciesId")).andExpect(status().isOk)
    mockMvc.perform(get("/plants/$plantId")).andExpect(status().isOk)
  }

  private fun speciesBody(
    scientificName: String = "Ferocactus glaucescens",
    commonName: String = "Biznaga azul",
    minHumidity: Int = 10,
    maxHumidity: Int = 30,
    minTemperature: Int = 12,
    maxTemperature: Int = 35,
    minLightHours: Int = 6,
    maxLightHours: Int = 10,
    wateringGuideline: String = "cada 15 dias en crecimiento",
    soilMixId: String? = seededSoilMixId.toString(),
  ) = json(
    "scientificName" to scientificName,
    "commonName" to commonName,
    "minHumidity" to minHumidity,
    "maxHumidity" to maxHumidity,
    "minTemperature" to minTemperature,
    "maxTemperature" to maxTemperature,
    "minLightHours" to minLightHours,
    "maxLightHours" to maxLightHours,
    "wateringGuideline" to wateringGuideline,
    "soilMixId" to soilMixId,
  )

  private fun createSpecies(body: String) {
    mockMvc.perform(
      post("/species")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body),
    ).andExpect(status().isCreated)
  }

  private fun countSpecies(): Int =
    jdbcTemplate.queryForObject("SELECT count(*) FROM species", Int::class.java) ?: 0

  /**
   * Siembra por SQL a propósito: estos escenarios son del listado, y no deben depender de que
   * `POST /species` ya exista ni de que siga funcionando.
   */
  private fun insertSpecies(
    scientificName: String,
    commonName: String = "Especie de prueba",
    minHumidity: Int = 10,
    maxHumidity: Int = 30,
    minTemperature: Int = 10,
    maxTemperature: Int = 35,
    minLightHours: Int = 6,
    maxLightHours: Int = 10,
    wateringGuideline: String = "cada 10 dias",
  ): Long {
    val id = System.nanoTime()
    jdbcTemplate.update(
      """
      INSERT INTO species
          (id, scientific_name, common_name, min_humidity, max_humidity, min_temperature,
           max_temperature, min_light_hours, max_light_hours, watering_guideline, soil_mix_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      id,
      scientificName,
      commonName,
      minHumidity,
      maxHumidity,
      minTemperature,
      maxTemperature,
      minLightHours,
      maxLightHours,
      wateringGuideline,
      seededSoilMixId,
    )
    return id
  }
}

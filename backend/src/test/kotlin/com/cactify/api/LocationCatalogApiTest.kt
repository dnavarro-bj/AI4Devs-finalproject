package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de «Consulta de una localización con su uso», «Corrección del nombre de una
 * localización» y «Retirada de una localización». El alta y el listado siguen en
 * [LocationApiTest], que no se toca.
 */
class LocationCatalogApiTest : AbstractApiIntegrationTest() {

  @Test
  fun `a location is consulted with the number of plants it holds`() {
    val locationId = createLocation("Invernadero con ejemplares")
    createPlant(locationId)
    createPlant(locationId)

    mockMvc.perform(get("/locations/$locationId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(locationId))
      .andExpect(jsonPath("$.name").value("Invernadero con ejemplares"))
      .andExpect(jsonPath("$.plantCount").value(2))
  }

  /** El cero se dice, no se omite: es lo que decide si la localización se puede retirar. */
  @Test
  fun `an empty location answers zero plants`() {
    val locationId = createLocation("Estanteria vacia")

    mockMvc.perform(get("/locations/$locationId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.plantCount").value(0))
  }

  @Test
  fun `consulting a location that does not exist is a 404`() {
    mockMvc.perform(get("/locations/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
      .andExpect(jsonPath("$.message").isNotEmpty)
  }

  /** El mapa del vivero se apoya en esto: el catálogo trae la carga de cada sitio. */
  @Test
  fun `the catalog lists each location with the number of plants it holds`() {
    clearLocations()
    val busy = createLocation("Invernadero lleno")
    createLocation("Estanteria vacia")
    createPlant(busy)
    createPlant(busy)

    mockMvc.perform(get("/locations").param("size", "500"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[?(@.name == 'Invernadero lleno')].plantCount").value(hasItems(2)))
      .andExpect(jsonPath("$.content[?(@.name == 'Estanteria vacia')].plantCount").value(hasItems(0)))
  }

  @Test
  fun `a location is renamed and the plants it holds do not change`() {
    val locationId = createLocation("Invernadero 1")
    val plantId = createPlant(locationId)

    mockMvc.perform(
      put("/locations/$locationId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Invernadero principal")),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(locationId))
      .andExpect(jsonPath("$.name").value("Invernadero principal"))

    mockMvc.perform(get("/locations/$locationId"))
      .andExpect(jsonPath("$.name").value("Invernadero principal"))
      .andExpect(jsonPath("$.plantCount").value(1))
    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.location.id").value(locationId))
      .andExpect(jsonPath("$.location.name").value("Invernadero principal"))
  }

  @Test
  fun `a blank name is rejected with 400 and the location keeps the one it had`() {
    val locationId = createLocation("Bandeja A3")

    mockMvc.perform(
      put("/locations/$locationId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "   ")),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
      .andExpect(jsonPath("$.message").isNotEmpty)

    mockMvc.perform(get("/locations/$locationId"))
      .andExpect(jsonPath("$.name").value("Bandeja A3"))
  }

  @Test
  fun `renaming a location that does not exist is a 404`() {
    mockMvc.perform(
      put("/locations/999999999")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Da igual")),
    )
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  @Test
  fun `an empty location is withdrawn and disappears from the catalog`() {
    val locationId = createLocation("Localizacion efimera")

    mockMvc.perform(delete("/locations/$locationId")).andExpect(status().isNoContent)

    mockMvc.perform(get("/locations/$locationId")).andExpect(status().isNotFound)
    mockMvc.perform(get("/locations").param("size", "500"))
      .andExpect(jsonPath("$.content[*].name").value(not(hasItems("Localizacion efimera"))))
  }

  /** Una planta no puede quedarse sin sitio: el `409` protege a los ejemplares, no al catálogo. */
  @Test
  fun `withdrawing a location that holds plants is a 409 and nothing is lost`() {
    val locationId = createLocation("Invernadero ocupado")
    val plantId = createPlant(locationId)

    mockMvc.perform(delete("/locations/$locationId"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.message").isNotEmpty)

    mockMvc.perform(get("/locations/$locationId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.plantCount").value(1))
    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.location.id").value(locationId))
  }

  @Test
  fun `withdrawing a location that does not exist is a 404`() {
    mockMvc.perform(delete("/locations/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  private fun createLocation(name: String): String {
    val response = mockMvc.perform(
      post("/locations")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to name)),
    )
      .andExpect(status().isCreated)
      .andReturn()
      .response
      .contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun createPlant(locationId: String): String {
    val speciesId = jdbcTemplate.queryForObject("SELECT id FROM species LIMIT 1", Long::class.java)
    val response = mockMvc.perform(
      post("/plants")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
          json(
            "nickname" to "Ejemplar de prueba",
            "locationId" to locationId,
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
}

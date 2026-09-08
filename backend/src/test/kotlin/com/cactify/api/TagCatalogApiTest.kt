package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.hasItems
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de «Consulta de una etiqueta con su uso», «Renombrado de una etiqueta»,
 * «Combinación de etiquetas duplicadas» y «Retirada de una etiqueta en uso». El alta y el listado
 * siguen en [TagApiTest], que no se toca.
 */
class TagCatalogApiTest : AbstractApiIntegrationTest() {

  /**
   * Los datos semilla traen etiquetas con estos mismos nombres, y el catálogo es único por nombre
   * normalizado: sin vaciarlo, el alta de la etiqueta de prueba chocaría con la semilla. Cada test
   * corre en su transacción y revierte, así que vaciarlo no afecta a los demás.
   */
  @BeforeEach
  fun emptyCatalog() = clearTags()

  @Test
  fun `a tag is consulted with its normalized name and how many plants have it`() {
    val tagId = createTag("Globular")
    tagPlant(createPlant(), tagId)
    tagPlant(createPlant(), tagId)

    mockMvc.perform(get("/tags/$tagId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(tagId))
      .andExpect(jsonPath("$.name").value("Globular"))
      .andExpect(jsonPath("$.normalizedName").value("globular"))
      .andExpect(jsonPath("$.plantCount").value(2))
  }

  /** El cero se dice, no se omite: es lo que decide si la etiqueta se puede retirar. */
  @Test
  fun `a tag nobody uses answers zero plants`() {
    val tagId = createTag("Sin uso")

    mockMvc.perform(get("/tags/$tagId"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.plantCount").value(0))
  }

  @Test
  fun `consulting a tag that does not exist is a 404`() {
    mockMvc.perform(get("/tags/999999999"))
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  /** El catálogo trae el uso de cada etiqueta: es lo que permite compararlas sin abrir sus fichas. */
  @Test
  fun `the catalog lists each tag with how many plants have it`() {
    val busy = createTag("Muy usada")
    createTag("Sin uso")
    tagPlant(createPlant(), busy)

    mockMvc.perform(get("/tags").param("size", "500"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[?(@.name == 'Muy usada')].plantCount").value(hasItems(1)))
      .andExpect(jsonPath("$.content[?(@.name == 'Sin uso')].plantCount").value(hasItems(0)))
  }

  @Test
  fun `a tag is renamed and the plants that had it keep it`() {
    val tagId = createTag("Globlar")
    val plantId = createPlant()
    tagPlant(plantId, tagId)

    mockMvc.perform(
      put("/tags/$tagId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Globular")),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.name").value("Globular"))

    mockMvc.perform(get("/tags/$tagId")).andExpect(jsonPath("$.plantCount").value(1))
    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(jsonPath("$.tags[*].name").value(hasItems("Globular")))
  }

  @Test
  fun `renaming to a name already used is a 409 and the tag keeps its own`() {
    createTag("Semillero propio")
    val tagId = createTag("Semilleros 2021")

    mockMvc.perform(
      put("/tags/$tagId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "  SEMILLERO PROPIO ")),
    )
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))

    mockMvc.perform(get("/tags/$tagId")).andExpect(jsonPath("$.name").value("Semilleros 2021"))
  }

  /** El error clásico de esta comprobación: compararse por nombre y chocar consigo misma. */
  @Test
  fun `renaming a tag to the name it already had is not a conflict`() {
    val tagId = createTag("Globular")

    mockMvc.perform(
      put("/tags/$tagId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Globular")),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.name").value("Globular"))
  }

  @Test
  fun `a blank name is rejected with 400`() {
    val tagId = createTag("Globular")

    mockMvc.perform(
      put("/tags/$tagId")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "   ")),
    )
      .andExpect(status().isBadRequest)

    mockMvc.perform(get("/tags/$tagId")).andExpect(jsonPath("$.name").value("Globular"))
  }

  @Test
  fun `renaming a tag that does not exist is a 404`() {
    mockMvc.perform(
      put("/tags/999999999")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Da igual")),
    ).andExpect(status().isNotFound)
  }

  @Test
  fun `merging moves the plants to the target and retires the source`() {
    val source = createTag("Semilleros 2021")
    val target = createTag("Semillero propio")
    val plantId = createPlant()
    tagPlant(plantId, source)

    mockMvc.perform(
      post("/tags/$source/merge")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("targetId" to target)),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.target.id").value(target))
      .andExpect(jsonPath("$.affectedPlants").value(1))

    mockMvc.perform(get("/tags/$source")).andExpect(status().isNotFound)
    mockMvc.perform(get("/tags/$target")).andExpect(jsonPath("$.plantCount").value(1))
    mockMvc.perform(get("/plants/$plantId"))
      .andExpect(jsonPath("$.tags[*].name").value(hasItems("Semillero propio")))
      .andExpect(jsonPath("$.tags[*].name").value(not(hasItems("Semilleros 2021"))))
  }

  /** El caso que rompe la combinación ingenua: la clave compuesta de `plant_tag`. */
  @Test
  fun `a plant that already had both keeps the target once and the merge does not fail`() {
    val source = createTag("Semilleros 2021")
    val target = createTag("Semillero propio")
    val both = createPlant()
    val onlySource = createPlant()
    tagPlant(both, source, target)
    tagPlant(onlySource, source)

    mockMvc.perform(
      post("/tags/$source/merge")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("targetId" to target)),
    )
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.affectedPlants").value(2))

    mockMvc.perform(get("/tags/$target")).andExpect(jsonPath("$.plantCount").value(2))
    mockMvc.perform(get("/plants/$both"))
      .andExpect(jsonPath("$.tags.length()").value(1))
      .andExpect(jsonPath("$.tags[0].name").value("Semillero propio"))
  }

  @Test
  fun `merging a tag into itself is a 400 and nothing is retired`() {
    val tagId = createTag("Globular")

    mockMvc.perform(
      post("/tags/$tagId/merge")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("targetId" to tagId)),
    )
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))

    mockMvc.perform(get("/tags/$tagId")).andExpect(status().isOk)
  }

  @Test
  fun `merging with a tag that does not exist is a 404 and nothing is retired`() {
    val tagId = createTag("Globular")

    mockMvc.perform(
      post("/tags/$tagId/merge")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("targetId" to "999999999")),
    ).andExpect(status().isNotFound)

    mockMvc.perform(
      post("/tags/999999999/merge")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("targetId" to tagId)),
    ).andExpect(status().isNotFound)

    mockMvc.perform(get("/tags/$tagId")).andExpect(status().isOk)
  }

  @Test
  fun `a tag nobody uses is withdrawn from the catalog`() {
    val tagId = createTag("Etiqueta efímera")

    mockMvc.perform(delete("/tags/$tagId")).andExpect(status().isNoContent)

    mockMvc.perform(get("/tags/$tagId")).andExpect(status().isNotFound)
    mockMvc.perform(get("/tags").param("size", "500"))
      .andExpect(jsonPath("$.content[*].name").value(not(hasItems("Etiqueta efímera"))))
  }

  /** Sin esta comprobación el borrado se llevaría las asignaciones en cascada, en silencio. */
  @Test
  fun `withdrawing a tag in use is a 409 and the tag stays`() {
    val tagId = createTag("Globular")
    tagPlant(createPlant(), tagId)

    mockMvc.perform(delete("/tags/$tagId"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.message").isNotEmpty)

    mockMvc.perform(get("/tags/$tagId")).andExpect(status().isOk)
  }

  @Test
  fun `withdrawing a tag that does not exist is a 404`() {
    mockMvc.perform(delete("/tags/999999999")).andExpect(status().isNotFound)
  }

  private fun createTag(name: String): String {
    val response = mockMvc.perform(
      post("/tags").contentType(MediaType.APPLICATION_JSON).content(json("name" to name)),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun createPlant(): String {
    val locationId = jdbcTemplate.queryForObject("SELECT id FROM location LIMIT 1", Long::class.java)
    val speciesId = jdbcTemplate.queryForObject("SELECT id FROM species LIMIT 1", Long::class.java)
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON).content(
        json(
          "nickname" to "Ejemplar de prueba",
          "locationId" to locationId.toString(),
          "speciesId" to speciesId.toString(),
        ),
      ),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun tagPlant(plantId: String, vararg tagIds: String) {
    mockMvc.perform(
      put("/plants/$plantId/tags")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("tagIds" to tagIds.toList()))),
    ).andExpect(status().isOk)
  }
}

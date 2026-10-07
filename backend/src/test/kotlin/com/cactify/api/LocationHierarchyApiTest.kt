package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.containsInAnyOrder
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de la jerarquía de localizaciones: alta, listado, ficha, edición y retirada. */
class LocationHierarchyApiTest : AbstractApiIntegrationTest() {

  /** Las localizaciones de la semilla ya tienen código (`LOC-I1`...): cada test parte de un catálogo vacío. */
  @BeforeEach
  fun emptyCatalog() = clearLocations()

  // ---- alta ----

  @Test
  fun `a root location is created with its code and no parent`() {
    create("Invernadero 1", "LOC-I1")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.id").isNotEmpty)
      .andExpect(jsonPath("$.name").value("Invernadero 1"))
      .andExpect(jsonPath("$.code").value("LOC-I1"))
      .andExpect(jsonPath("$.parentId").doesNotExist())
      .andExpect(jsonPath("$.ancestors.length()").value(0))
  }

  @Test
  fun `a location created inside another has the route of its ancestors`() {
    val greenhouse = id(create("Invernadero 1", "LOC-I1"))

    create("Bancada norte", "LOC-I1-BN", "parentId" to greenhouse)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.parentId").value(greenhouse))
      .andExpect(jsonPath("$.ancestors[*].name").value(contains("Invernadero 1")))
  }

  @Test
  fun `a location is created with its full sheet`() {
    val id = id(
      create(
        "Bancada norte", "LOC-I1-BN",
        "locationType" to "bancada", "capacity" to 250, "environment" to "cubierto",
        "sunExposure" to "semisombra", "operationalNotes" to "Malla fija", "description" to "Junto a la entrada",
      ),
    )

    mockMvc.perform(get("/locations/$id"))
      .andExpect(jsonPath("$.locationType").value("bancada"))
      .andExpect(jsonPath("$.capacity").value(250))
      .andExpect(jsonPath("$.environment").value("cubierto"))
      .andExpect(jsonPath("$.sunExposure").value("semisombra"))
      .andExpect(jsonPath("$.operationalNotes").value("Malla fija"))
      .andExpect(jsonPath("$.description").value("Junto a la entrada"))
  }

  @Test
  fun `a location without a code is rejected with 400`() {
    mockMvc.perform(post("/locations").contentType(MediaType.APPLICATION_JSON).content(json("name" to "Invernadero 1")))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").isNotEmpty)
    mockMvc.perform(post("/locations").contentType(MediaType.APPLICATION_JSON).content(json("name" to "Invernadero 1", "code" to "  ")))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("código")))
  }

  @Test
  fun `a code already in use is a 409 ignoring case and nothing is created`() {
    create("Invernadero 1", "LOC-I1")
    val before = countLocations()

    create("Otra", "loc-i1").andExpect(status().isConflict).andExpect(jsonPath("$.status").value(409))

    kotlin.test.assertEquals(before, countLocations())
  }

  @Test
  fun `a parent that does not exist is a 400`() {
    create("Bancada", "LOC-B", "parentId" to "999999999")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.status").value(400))
  }

  @Test
  fun `a value out of the vocabulary or a capacity that is not positive is a 400`() {
    create("A", "LOC-A", "locationType" to "almacen").andExpect(status().isBadRequest)
    create("B", "LOC-B", "environment" to "ambos").andExpect(status().isBadRequest)
    create("C", "LOC-C", "sunExposure" to "radiante").andExpect(status().isBadRequest)
    create("D", "LOC-D", "capacity" to 0).andExpect(status().isBadRequest)
  }

  // ---- listado ----

  @Test
  fun `the catalog gives the route, the parent and the direct and total counts of each location`() {
    val tree = tree()
    createPlants(tree.bancada, 4)
    createPlants(tree.bandejaA3, 31)
    createPlants(tree.bandejaA4, 27)

    mockMvc.perform(get("/locations").param("size", "500"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[?(@.name == 'Bancada norte')].plantCount").value(contains(4)))
      .andExpect(jsonPath("$.content[?(@.name == 'Bancada norte')].plantCountTotal").value(contains(62)))
      .andExpect(jsonPath("$.content[?(@.name == 'Bandeja A3')].plantCount").value(contains(31)))
      .andExpect(jsonPath("$.content[?(@.name == 'Bandeja A3')].plantCountTotal").value(contains(31)))
      .andExpect(jsonPath("$.content[?(@.name == 'Bandeja A3')].path").value(contains("Invernadero 1 / Bancada norte / Bandeja A3")))
      .andExpect(jsonPath("$.content[?(@.name == 'Invernadero 1')].path").value(contains("Invernadero 1")))
      .andExpect(jsonPath("$.content[?(@.name == 'Invernadero 1')].plantCountTotal").value(contains(62)))
      .andExpect(jsonPath("$.content[?(@.name == 'Bandeja A3')].parentId").value(contains(tree.bancada)))
  }

  @Test
  fun `a location just created has zero direct and zero total plants`() {
    clearLocations()
    create("Nueva", "LOC-N")

    mockMvc.perform(get("/locations"))
      .andExpect(jsonPath("$.content[0].plantCount").value(0))
      .andExpect(jsonPath("$.content[0].plantCountTotal").value(0))
  }

  @Test
  fun `the catalog can ask for the children of a node or only for the roots`() {
    clearLocations()
    val tree = tree()

    mockMvc.perform(get("/locations").param("parentId", tree.bancada))
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.content[*].name").value(containsInAnyOrder("Bandeja A3", "Bandeja A4")))
    mockMvc.perform(get("/locations").param("root", "true"))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].name").value("Invernadero 1"))
  }

  // ---- ficha ----

  @Test
  fun `the sheet gives the ancestors root first, the children and the counts`() {
    val tree = tree()
    createPlants(tree.bancada, 4)
    createPlants(tree.bandejaA3, 31)
    createPlants(tree.bandejaA4, 27)

    mockMvc.perform(get("/locations/${tree.bandejaA3}"))
      .andExpect(jsonPath("$.ancestors[*].name").value(contains("Invernadero 1", "Bancada norte")))
      .andExpect(jsonPath("$.ancestors[0].id").value(tree.invernadero))
      .andExpect(jsonPath("$.plantCount").value(31))
      .andExpect(jsonPath("$.plantCountTotal").value(31))
      .andExpect(jsonPath("$.children.length()").value(0))

    mockMvc.perform(get("/locations/${tree.bancada}"))
      .andExpect(jsonPath("$.plantCount").value(4))
      .andExpect(jsonPath("$.plantCountTotal").value(62))
      .andExpect(jsonPath("$.children[*].name").value(contains("Bandeja A3", "Bandeja A4")))
      .andExpect(jsonPath("$.children[?(@.name == 'Bandeja A3')].plantCount").value(contains(31)))
      .andExpect(jsonPath("$.children[?(@.name == 'Bandeja A3')].plantCountTotal").value(contains(31)))
  }

  @Test
  fun `an empty location answers zero plants and an empty list of children`() {
    val id = id(create("Vacia", "LOC-V"))

    mockMvc.perform(get("/locations/$id"))
      .andExpect(jsonPath("$.plantCount").value(0))
      .andExpect(jsonPath("$.plantCountTotal").value(0))
      .andExpect(jsonPath("$.children").isArray)
      .andExpect(jsonPath("$.children.length()").value(0))
  }

  // ---- edición ----

  @Test
  fun `renaming a location is shown in the route of its descendants`() {
    val tree = tree()

    update(tree.invernadero, "Invernadero principal", "LOC-I1").andExpect(status().isOk)

    mockMvc.perform(get("/locations/${tree.bandejaA3}"))
      .andExpect(jsonPath("$.ancestors[0].name").value("Invernadero principal"))
  }

  @Test
  fun `the code can be changed even with plants and sublocations`() {
    val tree = tree()
    createPlants(tree.bancada, 2)

    update(tree.bancada, "Bancada norte", "LOC-NUEVO", "parentId" to tree.invernadero)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.code").value("LOC-NUEVO"))
      .andExpect(jsonPath("$.plantCount").value(2))
      .andExpect(jsonPath("$.children.length()").value(2))
  }

  @Test
  fun `a code of another location is a 409 and the location keeps its own`() {
    val tree = tree()

    update(tree.bancada, "Bancada norte", "LOC-I1", "parentId" to tree.invernadero).andExpect(status().isConflict)

    mockMvc.perform(get("/locations/${tree.bancada}")).andExpect(jsonPath("$.code").value("LOC-I1-BN"))
  }

  @Test
  fun `a location keeps its own code on a replacement that does not change it`() {
    val id = id(create("Invernadero 1", "LOC-I1"))

    update(id, "Invernadero uno", "LOC-I1").andExpect(status().isOk)
  }

  @Test
  fun `moving a location with content changes its route and the totals but moves no plant and records no movement`() {
    val tree = tree()
    val other = id(create("Invernadero 2", "LOC-I2"))
    createPlants(tree.bandejaA3, 31)
    createPlants(tree.bandejaA4, 27)

    update(tree.bancada, "Bancada norte", "LOC-I1-BN", "parentId" to other).andExpect(status().isOk)

    mockMvc.perform(get("/locations/${tree.bandejaA3}"))
      .andExpect(jsonPath("$.ancestors[*].name").value(contains("Invernadero 2", "Bancada norte")))
      .andExpect(jsonPath("$.plantCount").value(31))
    mockMvc.perform(get("/locations/$other")).andExpect(jsonPath("$.plantCountTotal").value(58))
    mockMvc.perform(get("/locations/${tree.invernadero}")).andExpect(jsonPath("$.plantCountTotal").value(0))
    flushPersistenceContext()
    kotlin.test.assertEquals(0, jdbcTemplate.queryForObject("SELECT count(*) FROM plant_movement", Int::class.java))
  }

  @Test
  fun `a location cannot be its own parent`() {
    val tree = tree()

    update(tree.invernadero, "Invernadero 1", "LOC-I1", "parentId" to tree.invernadero)
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
  }

  @Test
  fun `a location cannot hang from one of its descendants and the hierarchy does not change`() {
    val tree = tree()

    update(tree.invernadero, "Invernadero 1", "LOC-I1", "parentId" to tree.bandejaA3).andExpect(status().isConflict)

    mockMvc.perform(get("/locations/${tree.invernadero}")).andExpect(jsonPath("$.parentId").doesNotExist())
    mockMvc.perform(get("/locations/${tree.bandejaA3}")).andExpect(jsonPath("$.ancestors.length()").value(2))
  }

  @Test
  fun `a location without a parent in the replacement becomes a root`() {
    val tree = tree()

    update(tree.bancada, "Bancada norte", "LOC-I1-BN").andExpect(status().isOk).andExpect(jsonPath("$.parentId").doesNotExist())
    mockMvc.perform(get("/locations").param("root", "true").param("size", "500"))
      .andExpect(jsonPath("$.content[*].name").value(hasItems("Invernadero 1", "Bancada norte")))
  }

  @Test
  fun `a blank name or code in an edit is a 400`() {
    val id = id(create("Invernadero 1", "LOC-I1"))

    update(id, "  ", "LOC-I1").andExpect(status().isBadRequest)
    update(id, "Invernadero 1", "  ").andExpect(status().isBadRequest)
  }

  @Test
  fun `a parent that does not exist in an edit is a 400 and editing a missing location is a 404`() {
    val id = id(create("Invernadero 1", "LOC-I1"))

    update(id, "Invernadero 1", "LOC-I1", "parentId" to "999999999").andExpect(status().isBadRequest)
    update("999999999", "X", "LOC-X").andExpect(status().isNotFound)
  }

  // ---- retirada ----

  @Test
  fun `a location with sublocations cannot be withdrawn even if they are empty`() {
    val tree = tree()

    mockMvc.perform(delete("/locations/${tree.bancada}"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("sublocalizaciones")))
    mockMvc.perform(get("/locations/${tree.bancada}")).andExpect(status().isOk)
  }

  @Test
  fun `a location with plants says so`() {
    val tree = tree()
    createPlants(tree.bandejaA3, 1)

    mockMvc.perform(delete("/locations/${tree.bandejaA3}"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("ejemplares")))
  }

  @Test
  fun `a location that appears in a movement cannot be withdrawn`() {
    val tree = tree()
    val plant = createPlants(tree.bandejaA3, 1).single()
    mockMvc.perform(
      post("/locations/${tree.bandejaA4}/movements").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(mapOf("plantIds" to listOf(plant)))),
    ).andExpect(status().isOk)

    // La bandeja A3 queda vacía, pero fue origen de un movimiento.
    mockMvc.perform(delete("/locations/${tree.bandejaA3}"))
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("movimientos")))
  }

  @Test
  fun `an empty leaf location without movements is withdrawn`() {
    val tree = tree()

    mockMvc.perform(delete("/locations/${tree.bandejaA4}")).andExpect(status().isNoContent)
    mockMvc.perform(get("/locations/${tree.bancada}")).andExpect(jsonPath("$.children.length()").value(1))
  }

  // ---- ayudas ----

  private class Tree(val invernadero: String, val bancada: String, val bandejaA3: String, val bandejaA4: String)

  /** Invernadero 1 > Bancada norte > {Bandeja A3, Bandeja A4}. */
  private fun tree(): Tree {
    val invernadero = id(create("Invernadero 1", "LOC-I1"))
    val bancada = id(create("Bancada norte", "LOC-I1-BN", "parentId" to invernadero))
    val a3 = id(create("Bandeja A3", "LOC-I1-A3", "parentId" to bancada))
    val a4 = id(create("Bandeja A4", "LOC-I1-A4", "parentId" to bancada))
    return Tree(invernadero, bancada, a3, a4)
  }

  private fun create(name: String, code: String, vararg extra: Pair<String, Any?>): ResultActions =
    mockMvc.perform(
      post("/locations").contentType(MediaType.APPLICATION_JSON).content(json("name" to name, "code" to code, *extra)),
    )

  private fun update(id: String, name: String, code: String, vararg extra: Pair<String, Any?>): ResultActions =
    mockMvc.perform(
      put("/locations/$id").contentType(MediaType.APPLICATION_JSON).content(json("name" to name, "code" to code, *extra)),
    )

  private fun id(result: ResultActions): String =
    objectMapper.readTree(result.andReturn().response.contentAsString).get("id").asText()

  /** Da de alta `count` ejemplares directamente en la localización y devuelve sus identificadores. */
  private fun createPlants(locationId: String, count: Int): List<String> = (1..count).map {
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Ejemplar $it", "locationId" to locationId, "speciesId" to "200001")),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    objectMapper.readTree(response).get("id").asText()
  }

  private fun countLocations(): Int = jdbcTemplate.queryForObject("SELECT count(*) FROM location", Int::class.java) ?: 0
}

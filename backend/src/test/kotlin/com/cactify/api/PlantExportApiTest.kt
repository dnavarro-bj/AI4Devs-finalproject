package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import com.cactify.CsvTestReader
import com.cactify.MutableClockConfiguration
import com.cactify.locationCode
import org.junit.jupiter.api.Test
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Exportación del inventario filtrado a CSV» y «Las celdas no se interpretan como fórmulas». */
@Import(MutableClockConfiguration::class)
class PlantExportApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001" // CAT-GRUSS
  private val mammillaria = "200002" // CAT-MAMMI

  private val header = listOf(
    "Código", "Apodo", "Código de especie", "Especie", "Localización", "Estado", "Etiquetas", "Descripción",
    "Año de germinación", "Mes de germinación", "Fecha de adquisición", "Procedencia", "Nota de procedencia", "Fecha de alta",
  )

  private fun createPlant(
    nickname: String = "Planta",
    speciesId: String = grusonii,
    locationId: String = "300001",
    extra: Map<String, Any?> = emptyMap(),
  ): String {
    val pairs = mutableListOf<Pair<String, Any?>>("nickname" to nickname, "locationId" to locationId, "speciesId" to speciesId)
    extra.forEach { (k, v) -> pairs.add(k to v) }
    val body = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON).content(json(*pairs.toTypedArray())),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(body).get("id").asText()
  }

  private fun export(vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(get("/plants/export").apply { params.forEach { (k, v) -> param(k, v) } })

  private fun rows(actions: ResultActions): List<List<String>> =
    CsvTestReader.read(actions.andExpect(status().isOk).andReturn().response.contentAsByteArray)

  private fun listedCodes(vararg params: Pair<String, String>): List<String> {
    val body = mockMvc.perform(get("/plants").param("size", "500").apply { params.forEach { (k, v) -> param(k, v) } })
      .andReturn().response.contentAsString
    return objectMapper.readTree(body).get("content").map { it.get("code").asText() }
  }

  private fun seed() {
    clearPlants()
    createPlant("Asiento de suegra")
    createPlant("Bola blanca", grusonii, "300002")
    createPlant("Pequeña", mammillaria)
    createPlant("Dedo", mammillaria, "300002", mapOf("status" to "cuarentena"))
  }

  @Test
  fun `the csv has the same rows as the listing with the same filters`() {
    seed()
    val cases = listOf(
      emptyArray(),
      arrayOf("species" to grusonii),
      arrayOf("status" to "cuarentena"),
      arrayOf("location" to "300002"),
      arrayOf("q" to "suegra"),
      arrayOf("species" to mammillaria, "status" to "cuarentena"),
    )

    cases.forEach { params ->
      val csv = rows(export(*params)).drop(1).map { it[0] }
      assertEquals(listedCodes(*params), csv, "con ${params.toList()}")
    }
  }

  @Test
  fun `the response is a dated csv download starting with the byte order mark`() {
    seed()

    val response = export().andExpect(status().isOk)
      .andExpect(content().contentTypeCompatibleWith("text/csv"))
      .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("charset=UTF-8")))
      .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.allOf(
        org.hamcrest.Matchers.containsString("attachment"),
        org.hamcrest.Matchers.containsString("cactify-plantas-2026-08-14.csv"),
      )))
      .andReturn().response

    assertContentEquals(byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte()), response.contentAsByteArray.copyOfRange(0, 3))
  }

  @Test
  fun `the columns are fixed and complete`() {
    seed()

    assertEquals(header, rows(export()).first())
  }

  @Test
  fun `more rows than a page are all exported`() {
    clearPlants()
    repeat(30) { createPlant("Planta $it") }

    assertEquals(30, rows(export()).size - 1)
    assertEquals(30, rows(export("size" to "5", "page" to "2")).size - 1, "page y size se ignoran")
  }

  @Test
  fun `the requested order is respected`() {
    seed()

    val bySpecies = rows(export("sort" to "species,asc")).drop(1).map { it[3] }
    assertEquals(bySpecies.sorted(), bySpecies)
    val reversed = rows(export("sort" to "species,desc")).drop(1).map { it[3] }
    assertEquals(reversed.sortedDescending(), reversed)
  }

  @Test
  fun `no result is only the header`() {
    seed()

    val csv = rows(export("q" to "no-existe"))
    assertEquals(listOf(header), csv)
  }

  @Test
  fun `values with commas, quotes and line breaks are read back unchanged`() {
    clearPlants()
    createPlant("Cactus, \"grande\"\nsegunda línea")

    assertEquals("Cactus, \"grande\"\nsegunda línea", rows(export())[1][1])
  }

  @Test
  fun `a nickname that looks like a formula gets an apostrophe`() {
    clearPlants()
    createPlant("=HYPERLINK(\"http://example.com\",\"pulsa\")")
    createPlant("Asiento-de-suegra")

    val nicknames = rows(export()).drop(1).map { it[1] }
    assertTrue("'=HYPERLINK(\"http://example.com\",\"pulsa\")" in nicknames)
    assertTrue("Asiento-de-suegra" in nicknames)
  }

  @Test
  fun `an invalid filter is a 400 like in the listing`() {
    export("status" to "resucitada").andExpect(status().isBadRequest)
    export("species" to "abc").andExpect(status().isBadRequest)
    export("sort" to "tagSet,asc").andExpect(status().isBadRequest)
  }

  @Test
  fun `without a status filter only what is in progress is exported`() {
    seed()
    val archived = createPlant("Muerta")
    mockMvc.perform(
      put("/plants/$archived/status").contentType(MediaType.APPLICATION_JSON).content(json("status" to "muerta")),
    ).andExpect(status().isOk)

    assertTrue(rows(export()).drop(1).none { it[1] == "Muerta" })
    assertTrue(rows(export("status" to "muerta")).drop(1).any { it[1] == "Muerta" })
  }

  @Test
  fun `tags are joined with a semicolon and the location is its full path`() {
    clearPlants()
    clearTags()
    val parent = mockMvc.perform(
      post("/locations").contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Vivero norte", "code" to locationCode("Vivero norte"))),
    ).andReturn().response.contentAsString.let { objectMapper.readTree(it).get("id").asText() }
    val child = mockMvc.perform(
      post("/locations").contentType(MediaType.APPLICATION_JSON)
        .content(json("name" to "Bancada 2", "code" to locationCode("Bancada 2"), "parentId" to parent)),
    ).andReturn().response.contentAsString.let { objectMapper.readTree(it).get("id").asText() }
    val plant = createPlant("Con etiquetas", locationId = child)
    val tags = listOf("globular", "columnar").map { name ->
      mockMvc.perform(post("/tags").contentType(MediaType.APPLICATION_JSON).content(json("name" to name)))
        .andReturn().response.contentAsString.let { objectMapper.readTree(it).get("id").asText() }
    }
    mockMvc.perform(
      put("/plants/$plant/tags").contentType(MediaType.APPLICATION_JSON).content(json("tagIds" to tags)),
    ).andExpect(status().isOk)

    val row = rows(export()).drop(1).single()
    assertEquals("Vivero norte / Bancada 2", row[4])
    assertEquals("columnar;globular", row[6])
  }

  @Test
  fun `profile data is exported`() {
    clearPlants()
    createPlant(
      "Con ficha",
      extra = mapOf(
        "description" to "Planta madre", "germinationYear" to 2021, "germinationMonth" to 5,
        "acquiredOn" to "2022-03-04", "origin" to "vivero", "originNote" to "Vivero La Palma",
      ),
    )

    val row = rows(export()).drop(1).single()
    assertEquals(listOf("Planta madre", "2021", "5", "2022-03-04", "vivero", "Vivero La Palma"), row.subList(7, 13))
    assertEquals("2026-08-14T09:30:00Z", row[13].take(20))
  }

  @Test
  fun `the literal route wins over the id route`() {
    seed()

    export().andExpect(status().isOk).andExpect(content().contentTypeCompatibleWith("text/csv"))
    mockMvc.perform(get("/plants/999999999")).andExpect(status().isNotFound).andExpect(jsonPath("$.status").value(404))
  }
}

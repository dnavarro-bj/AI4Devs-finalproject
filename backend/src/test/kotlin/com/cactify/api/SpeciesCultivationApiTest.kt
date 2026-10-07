package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Ficha de cultivo de la especie», «Calendario anual de la especie» y la ficha que los devuelve. */
class SpeciesCultivationApiTest : AbstractApiIntegrationTest() {

  private fun period(type: String, start: Int, end: Int, intensity: String? = null, notes: String? = null) =
    mapOf("type" to type, "startMonth" to start, "endMonth" to end, "intensity" to intensity, "notes" to notes)

  private fun body(
    code: String = "TEST-CULT",
    scientificName: String = "Test cultivationis",
    vararg extra: Pair<String, Any?>,
  ): String = json(
    "code" to code, "scientificName" to scientificName, "commonName" to "Prueba",
    "minHumidity" to 15, "maxHumidity" to 40, "minTemperature" to 5, "maxTemperature" to 34,
    "minLightHours" to 5, "maxLightHours" to 9, "wateringGuideline" to "cada 10 dias", "soilMixId" to "100001",
    *extra,
  )

  private fun create(vararg extra: Pair<String, Any?>): ResultActions =
    mockMvc.perform(post("/species").contentType(MediaType.APPLICATION_JSON).content(body(extra = extra)))

  private fun update(id: String, vararg extra: Pair<String, Any?>): ResultActions =
    mockMvc.perform(put("/species/$id").contentType(MediaType.APPLICATION_JSON).content(body(extra = extra)))

  private fun createdId(result: ResultActions): String =
    objectMapper.readTree(result.andReturn().response.contentAsString).get("id").asText()

  private fun detail(id: String): ResultActions = mockMvc.perform(get("/species/$id"))

  // --- Ficha de cultivo ---

  @Test
  fun `a species is created with its cultivation data and the detail returns it`() {
    val id = createdId(
      create(
        "description" to "Cactus globular", "sunExposure" to "pleno_sol", "environment" to "exterior",
        "bloomColor" to "Amarillo intenso", "bloomMaturity" to "15-20 años", "bloomTypicalDuration" to "3-5 días",
        "bloomDescription" to "Mejora tras un reposo seco",
      ).andExpect(status().isCreated),
    )

    detail(id)
      .andExpect(jsonPath("$.description").value("Cactus globular"))
      .andExpect(jsonPath("$.sunExposure").value("pleno_sol"))
      .andExpect(jsonPath("$.environment").value("exterior"))
      .andExpect(jsonPath("$.bloomColor").value("Amarillo intenso"))
      .andExpect(jsonPath("$.bloomMaturity").value("15-20 años"))
      .andExpect(jsonPath("$.bloomTypicalDuration").value("3-5 días"))
      .andExpect(jsonPath("$.bloomDescription").value("Mejora tras un reposo seco"))
      .andExpect(jsonPath("$.plantCount").value(0))
  }

  @Test
  fun `a species without the new fields is valid and the detail returns them empty`() {
    val id = createdId(create().andExpect(status().isCreated))

    detail(id)
      .andExpect(jsonPath("$.sunExposure").doesNotExist())
      .andExpect(jsonPath("$.environment").doesNotExist())
      .andExpect(jsonPath("$.description").doesNotExist())
      .andExpect(jsonPath("$.periods").isArray)
      .andExpect(jsonPath("$.periods.length()").value(0))
  }

  @Test
  fun `exposure and light hours are independent`() {
    create("sunExposure" to "sombra").andExpect(status().isCreated)
  }

  @Test
  fun `an unknown exposure is a 400 and nothing is saved`() {
    create("sunExposure" to "radiante")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("exposición")))

    mockMvc.perform(get("/species").param("code", "TEST-CULT")).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `seasonal is not an environment`() {
    create("environment" to "estacional").andExpect(status().isBadRequest)
  }

  // --- Calendario ---

  @Test
  fun `november to february is stored and returned as one period`() {
    val id = createdId(create("periods" to listOf(period("reposo", 11, 2, notes = "seco"))).andExpect(status().isCreated))

    detail(id)
      .andExpect(jsonPath("$.periods.length()").value(1))
      .andExpect(jsonPath("$.periods[0].type").value("reposo"))
      .andExpect(jsonPath("$.periods[0].startMonth").value(11))
      .andExpect(jsonPath("$.periods[0].endMonth").value(2))
      .andExpect(jsonPath("$.periods[0].notes").value("seco"))
      .andExpect(jsonPath("$.periods[0].id").isString)
  }

  @Test
  fun `several periods of the same type are accepted and come ordered`() {
    val id = createdId(
      create(
        "periods" to listOf(
          period("riego", 9, 10, "escaso"),
          period("floracion", 5, 7),
          period("riego", 3, 5, "moderado"),
        ),
      ).andExpect(status().isCreated),
    )

    detail(id)
      .andExpect(jsonPath("$.periods.length()").value(3))
      .andExpect(jsonPath("$.periods[0].type").value("floracion"))
      .andExpect(jsonPath("$.periods[1].startMonth").value(3))
      .andExpect(jsonPath("$.periods[1].intensity").value("moderado"))
      .andExpect(jsonPath("$.periods[2].startMonth").value(9))
  }

  @Test
  fun `overlapping periods of one type are a 400`() {
    create("periods" to listOf(period("crecimiento", 3, 7), period("crecimiento", 6, 10)))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("solapan")))
  }

  @Test
  fun `the overlap counts the year crossing`() {
    create("periods" to listOf(period("reposo", 11, 2), period("reposo", 1, 3))).andExpect(status().isBadRequest)
  }

  @Test
  fun `different types may coincide`() {
    create("periods" to listOf(period("crecimiento", 3, 10), period("floracion", 5, 7))).andExpect(status().isCreated)
  }

  @Test
  fun `the growth peak is stored over the growth and returned with it`() {
    val id = createdId(
      create("periods" to listOf(period("crecimiento", 3, 10), period("crecimiento_maximo", 5, 7))).andExpect(status().isCreated),
    )

    detail(id)
      .andExpect(jsonPath("$.periods.length()").value(2))
      .andExpect(jsonPath("$.periods[0].type").value("crecimiento"))
      .andExpect(jsonPath("$.periods[1].type").value("crecimiento_maximo"))
      .andExpect(jsonPath("$.periods[1].startMonth").value(5))
  }

  @Test
  fun `a growth peak outside the growth is a 400`() {
    create("periods" to listOf(period("crecimiento", 3, 6), period("crecimiento_maximo", 5, 8)))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("crecimiento máximo")))
    create("periods" to listOf(period("crecimiento_maximo", 5, 7))).andExpect(status().isBadRequest)
  }

  @Test
  fun `an invalid month is a 400`() {
    create("periods" to listOf(period("crecimiento", 13, 2))).andExpect(status().isBadRequest)
  }

  @Test
  fun `intensity only belongs to watering`() {
    create("periods" to listOf(period("riego", 3, 5))).andExpect(status().isBadRequest)
    create("periods" to listOf(period("crecimiento", 3, 5, "moderado"))).andExpect(status().isBadRequest)
  }

  @Test
  fun `an unknown period type is a 400`() {
    create("periods" to listOf(period("transicion", 3, 5)))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("transicion")))
  }

  @Test
  fun `an edit replaces the calendar`() {
    val id = createdId(
      create("periods" to listOf(period("crecimiento", 3, 10), period("reposo", 11, 2), period("floracion", 5, 7))),
    )

    update(id, "periods" to listOf(period("floracion", 6, 8))).andExpect(status().isOk)

    detail(id)
      .andExpect(jsonPath("$.periods.length()").value(1))
      .andExpect(jsonPath("$.periods[0].startMonth").value(6))
  }

  @Test
  fun `an edit omitting the calendar leaves none`() {
    val id = createdId(create("periods" to listOf(period("crecimiento", 3, 10))))

    update(id).andExpect(status().isOk)

    detail(id).andExpect(jsonPath("$.periods.length()").value(0))
  }

  @Test
  fun `a rejected edit keeps the previous calendar and data`() {
    val id = createdId(create("sunExposure" to "pleno_sol", "periods" to listOf(period("crecimiento", 3, 10))))

    update(id, "sunExposure" to "sombra", "periods" to listOf(period("crecimiento", 3, 7), period("crecimiento", 6, 9)))
      .andExpect(status().isBadRequest)

    detail(id)
      .andExpect(jsonPath("$.sunExposure").value("pleno_sol"))
      .andExpect(jsonPath("$.periods.length()").value(1))
      .andExpect(jsonPath("$.periods[0].endMonth").value(10))
  }

  // --- El listado y los ejemplares ---

  @Test
  fun `the listing does not carry the calendar`() {
    create("sunExposure" to "pleno_sol", "periods" to listOf(period("crecimiento", 3, 10)))

    mockMvc.perform(get("/species").param("code", "TEST-CULT"))
      .andExpect(jsonPath("$.content[0].sunExposure").doesNotExist())
      .andExpect(jsonPath("$.content[0].periods").doesNotExist())
  }

  @Test
  fun `editing the calendar does not touch the plants`() {
    val id = createdId(create("periods" to listOf(period("crecimiento", 3, 10))))
    val plant = objectMapper.readTree(
      mockMvc.perform(
        post("/plants").contentType(MediaType.APPLICATION_JSON)
          .content(json("nickname" to "Bola", "locationId" to "300001", "speciesId" to id)),
      ).andExpect(status().isCreated).andReturn().response.contentAsString,
    )
    val code = plant.get("code").asText()

    update(id, "periods" to listOf(period("reposo", 11, 2))).andExpect(status().isOk)

    mockMvc.perform(get("/plants/${plant.get("id").asText()}"))
      .andExpect(jsonPath("$.code").value(code))
      .andExpect(jsonPath("$.status").value("activa"))
    detail(id).andExpect(jsonPath("$.plantCount").value(1))
  }
}

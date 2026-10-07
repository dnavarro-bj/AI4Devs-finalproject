package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.containsInAnyOrder
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de «Búsqueda de texto en el catálogo de especies», «Filtros del catálogo por
 * características de cultivo» y «Ordenación del catálogo de especies por claves públicas».
 */
class SpeciesSearchApiTest : AbstractApiIntegrationTest() {

  private fun period(type: String, start: Int, end: Int) =
    mapOf("type" to type, "startMonth" to start, "endMonth" to end)

  private fun create(
    code: String,
    scientificName: String,
    commonName: String,
    minTemperature: Int = 5,
    soilMixId: String = "100001",
    vararg extra: Pair<String, Any?>,
  ) {
    mockMvc.perform(
      post("/species").contentType(MediaType.APPLICATION_JSON).content(
        json(
          "code" to code, "scientificName" to scientificName, "commonName" to commonName,
          "minHumidity" to 15, "maxHumidity" to 40, "minTemperature" to minTemperature, "maxTemperature" to 38,
          "minLightHours" to 5, "maxLightHours" to 9, "wateringGuideline" to "cada 10 dias", "soilMixId" to soilMixId,
          *extra,
        ),
      ),
    ).andExpect(status().isCreated)
  }

  /**
   * Cuatro especies:
   *  - GRUSS: pleno sol, exterior, mínima 8, crece de noviembre a marzo (cruza el fin de año), florece abril-mayo.
   *  - ASTRO: semisombra, interior, mínima 10, crece de diciembre a enero.
   *  - MAMMI: soleado, ambos, mínima 5, crece de junio a junio (un solo mes), sin floración.
   *  - ECHEV: sin definir y sin calendario.
   */
  private fun seed() {
    clearSpecies()
    create(
      "CAT-GRUSS", "Echinocactus grusonii", "Asiento de suegra", 8, "100001",
      "sunExposure" to "pleno_sol", "environment" to "exterior",
      "periods" to listOf(period("crecimiento", 11, 3), period("floracion", 4, 5)),
    )
    create(
      "CAT-ASTRO", "Astrophytum asterias", "Cactus erizo de mar", 10, "100002",
      "sunExposure" to "semisombra", "environment" to "interior",
      "periods" to listOf(period("crecimiento", 12, 1)),
    )
    create(
      "CAT-MAMMI", "Mammillaria bocasana", "Biznaga de lana", 5, "100001",
      "sunExposure" to "soleado", "environment" to "ambos",
      "periods" to listOf(period("crecimiento", 6, 6)),
    )
    create("CAT-ECHEV", "Echeveria elegans", "Rosa de piedra", 12, "100003")
  }

  private fun search(vararg params: Pair<String, String>) =
    mockMvc.perform(get("/species").apply { params.forEach { (name, value) -> param(name, value) } })

  // --- q ---

  @Test
  fun `q finds by common name`() {
    seed()

    search("q" to "suegra")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS"))
  }

  @Test
  fun `q finds by scientific name or by code`() {
    seed()

    search("q" to "asterias").andExpect(jsonPath("$.content[0].code").value("CAT-ASTRO"))
    search("q" to "mammi").andExpect(jsonPath("$.content[0].code").value("CAT-MAMMI"))
    search("q" to "GRUS").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `a blank q does not filter and the wildcards are text`() {
    seed()

    search("q" to "  ").andExpect(jsonPath("$.totalElements").value(4))
    search("q" to "%").andExpect(jsonPath("$.totalElements").value(0))
    search("q" to "_").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `the code parameter keeps working`() {
    seed()

    search("code" to "astro").andExpect(jsonPath("$.totalElements").value(1))
  }

  // --- rasgos ---

  @Test
  fun `exposure filters`() {
    seed()

    search("exposure" to "semisombra")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-ASTRO"))
    search("exposure" to "semisombra", "exposure" to "soleado").andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `environment and soil mix filter`() {
    seed()

    search("environment" to "ambos").andExpect(jsonPath("$.content[0].code").value("CAT-MAMMI"))
    search("soilMix" to "100002")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-ASTRO"))
    search("soilMix" to "100001", "soilMix" to "100003").andExpect(jsonPath("$.totalElements").value(3))
  }

  @Test
  fun `a species with nothing defined matches no concrete trait`() {
    seed()

    search("exposure" to "pleno_sol").andExpect(jsonPath("$.totalElements").value(1))
    search("environment" to "exterior").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the cold sensitive ones are those whose minimum is at least 9`() {
    seed()

    search("minTemperatureFrom" to "9")
      .andExpect(jsonPath("$.content[*].code").value(containsInAnyOrder("CAT-ASTRO", "CAT-ECHEV")))
  }

  @Test
  fun `a temperature interval includes both ends`() {
    seed()

    search("minTemperatureFrom" to "5", "minTemperatureTo" to "8")
      .andExpect(jsonPath("$.content[*].code").value(containsInAnyOrder("CAT-GRUSS", "CAT-MAMMI")))
    search("minTemperatureTo" to "5").andExpect(jsonPath("$.totalElements").value(1))
  }

  // --- meses ---

  @Test
  fun `winter growth, a period that crosses the end of the year covers december, january and february`() {
    seed()

    search("growthMonth" to "12", "growthMonth" to "1", "growthMonth" to "2")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS"))
  }

  @Test
  fun `a period that does not cover every requested month does not match`() {
    seed()

    // ASTRO crece de diciembre a enero: sin febrero.
    search("growthMonth" to "12", "growthMonth" to "1")
      .andExpect(jsonPath("$.content[*].code").value(containsInAnyOrder("CAT-GRUSS", "CAT-ASTRO")))
    search("growthMonth" to "1", "growthMonth" to "2")
      .andExpect(jsonPath("$.content[*].code").value(contains("CAT-GRUSS")))
  }

  @Test
  fun `a single month period`() {
    seed()

    search("growthMonth" to "6")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-MAMMI"))
    search("growthMonth" to "7").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a species with no calendar matches no month`() {
    seed()

    search("growthMonth" to "6").andExpect(jsonPath("$.content[*].code").value(contains("CAT-MAMMI")))
    search("bloomMonth" to "6").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `bloom months look at the flowering periods only`() {
    seed()

    search("bloomMonth" to "4", "bloomMonth" to "5")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS"))
    // El crecimiento de noviembre a marzo no cuenta como floración.
    search("bloomMonth" to "12").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a period filter does not multiply the rows`() {
    seed()

    search("growthMonth" to "12", "growthMonth" to "1", "size" to "1")
      .andExpect(jsonPath("$.totalElements").value(2))
      .andExpect(jsonPath("$.totalPages").value(2))
  }

  @Test
  fun `the filters combine`() {
    seed()

    search("exposure" to "pleno_sol", "minTemperatureTo" to "8", "growthMonth" to "1", "q" to "asiento")
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].code").value("CAT-GRUSS"))
  }

  @Test
  fun `invalid values are a 400`() {
    search("growthMonth" to "13").andExpect(status().isBadRequest)
    search("growthMonth" to "0").andExpect(status().isBadRequest)
    search("bloomMonth" to "abril").andExpect(status().isBadRequest)
    search("exposure" to "playa").andExpect(status().isBadRequest)
    search("environment" to "playa").andExpect(status().isBadRequest)
    search("minTemperatureFrom" to "frio").andExpect(status().isBadRequest)
    search("soilMix" to "abc").andExpect(status().isBadRequest)
  }

  @Test
  fun `a soil mix that does not exist is an empty page`() {
    seed()

    search("soilMix" to "999999999")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
  }

  // --- orden ---

  @Test
  fun `sorting by the public keys`() {
    seed()

    search("sort" to "scientificName,asc")
      .andExpect(jsonPath("$.content[*].code").value(contains("CAT-ASTRO", "CAT-ECHEV", "CAT-GRUSS", "CAT-MAMMI")))
    search("sort" to "commonName,desc")
      .andExpect(jsonPath("$.content[*].code").value(contains("CAT-ECHEV", "CAT-ASTRO", "CAT-MAMMI", "CAT-GRUSS")))
    search("sort" to "code,desc")
      .andExpect(jsonPath("$.content[*].code").value(contains("CAT-MAMMI", "CAT-GRUSS", "CAT-ECHEV", "CAT-ASTRO")))
  }

  @Test
  fun `sorting by exposure is by the exposure of the species`() {
    seed()

    // pleno_sol, semisombra, soleado y, al final, la que no la tiene definida.
    search("sort" to "exposure,asc")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.content[*].code").value(contains("CAT-GRUSS", "CAT-ASTRO", "CAT-MAMMI", "CAT-ECHEV")))
  }

  @Test
  fun `a key that is not public is a 400`() {
    search("sort" to "periodRows,asc").andExpect(status().isBadRequest)
    search("sort" to "soilMix,asc").andExpect(status().isBadRequest)
    search("sort" to "code,sideways").andExpect(status().isBadRequest)
  }

  @Test
  fun `without sort the default order is unchanged`() {
    seed()

    search().andExpect(jsonPath("$.content[0].scientificName").value("Astrophytum asterias"))
  }
}

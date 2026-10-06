package com.cactify.api

import com.cactify.AbstractApiIntegrationTest
import org.hamcrest.Matchers.containsInAnyOrder
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.empty
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Escenarios de «Cuidados propios del ejemplar», «Coherencia del perfil efectivo» y «Cambiar la
 * especie conserva los cuidados propios». Semillas: grusonii (200001) humedad 10-30, temperatura
 * 10-35, luz 6-10, sustrato 100001; mammillaria (200002) humedad 15-40; echeveria (200003) 20-50.
 */
class PlantCareOverridesApiTest : AbstractApiIntegrationTest() {

  private val grusonii = "200001"
  private val mammillaria = "200002"
  private val greenhouse = "300001"

  private fun body(speciesId: String = grusonii, care: Map<String, Any?>? = null, nickname: String = "Bola"): String {
    val pairs = mutableListOf<Pair<String, Any?>>("nickname" to nickname, "locationId" to greenhouse, "speciesId" to speciesId)
    if (care != null) pairs.add("careOverrides" to care)
    return json(*pairs.toTypedArray())
  }

  private fun create(care: Map<String, Any?>? = null, speciesId: String = grusonii): ResultActions =
    mockMvc.perform(post("/plants").contentType(MediaType.APPLICATION_JSON).content(body(speciesId, care)))

  private fun update(id: String, care: Map<String, Any?>? = null, speciesId: String = grusonii, nickname: String = "Bola"): ResultActions =
    mockMvc.perform(put("/plants/$id").contentType(MediaType.APPLICATION_JSON).content(body(speciesId, care, nickname)))

  private fun createdId(care: Map<String, Any?>? = null, speciesId: String = grusonii): String =
    objectMapper.readTree(create(care, speciesId).andExpect(status().isCreated).andReturn().response.contentAsString).get("id").asText()

  private fun detail(id: String) = mockMvc.perform(get("/plants/$id"))

  // --- Cuidados propios ---

  @Test
  fun `overriding a single value changes only that one in the effective care`() {
    val id = createdId(mapOf("wateringGuideline" to "cada 5 dias"))

    detail(id)
      .andExpect(jsonPath("$.effectiveCare.wateringGuideline").value("cada 5 dias"))
      .andExpect(jsonPath("$.effectiveCare.minHumidity").value(10))
      .andExpect(jsonPath("$.effectiveCare.maxHumidity").value(30))
      .andExpect(jsonPath("$.effectiveCare.maxTemperature").value(35))
      .andExpect(jsonPath("$.effectiveCare.soilMix.id").value("100001"))
  }

  @Test
  fun `the effective care lists exactly the fields that depart from the species`() {
    val id = createdId(mapOf("maxTemperature" to 30, "soilMixId" to "100002"))

    detail(id)
      .andExpect(jsonPath("$.effectiveCare.overridden").value(containsInAnyOrder("maxTemperature", "soilMix")))
      .andExpect(jsonPath("$.effectiveCare.maxTemperature").value(30))
      .andExpect(jsonPath("$.effectiveCare.soilMix.id").value("100002"))
      .andExpect(jsonPath("$.careOverrides.maxTemperature").value(30))
      .andExpect(jsonPath("$.careOverrides.soilMixId").value("100002"))
      .andExpect(jsonPath("$.careOverrides.minTemperature").doesNotExist())
  }

  @Test
  fun `a plant without own care has no overrides and inherits everything`() {
    val id = createdId()

    detail(id)
      .andExpect(jsonPath("$.careOverrides").doesNotExist())
      .andExpect(jsonPath("$.effectiveCare.overridden").value(empty<Any>()))
      .andExpect(jsonPath("$.effectiveCare.minHumidity").value(10))
      .andExpect(jsonPath("$.effectiveCare.wateringGuideline").value(containsString("cada 10-20")))
  }

  @Test
  fun `overriding the humidity leaves the other values untouched`() {
    val id = createdId(mapOf("minHumidity" to 12, "maxHumidity" to 28))

    detail(id)
      .andExpect(jsonPath("$.effectiveCare.minHumidity").value(12))
      .andExpect(jsonPath("$.effectiveCare.maxHumidity").value(28))
      .andExpect(jsonPath("$.effectiveCare.minTemperature").value(10))
      .andExpect(jsonPath("$.effectiveCare.minLightHours").value(6))
  }

  @Test
  fun `a change in the species watering guideline changes what is inherited`() {
    val id = createdId()
    mockMvc.perform(
      put("/species/$grusonii").contentType(MediaType.APPLICATION_JSON).content(speciesBody("cada 3 dias")),
    ).andExpect(status().isOk)

    detail(id).andExpect(jsonPath("$.effectiveCare.wateringGuideline").value("cada 3 dias"))
  }

  @Test
  fun `a change in the species watering guideline does not override an own value`() {
    val id = createdId(mapOf("wateringGuideline" to "cada 5 dias"))
    mockMvc.perform(
      put("/species/$grusonii").contentType(MediaType.APPLICATION_JSON).content(speciesBody("cada 3 dias")),
    ).andExpect(status().isOk)

    detail(id).andExpect(jsonPath("$.effectiveCare.wateringGuideline").value("cada 5 dias"))
  }

  @Test
  fun `an edit is a full replacement of the own care`() {
    val id = createdId(mapOf("minHumidity" to 12))

    update(id, mapOf("maxTemperature" to 30)).andExpect(status().isOk)

    detail(id)
      .andExpect(jsonPath("$.careOverrides.minHumidity").doesNotExist())
      .andExpect(jsonPath("$.careOverrides.maxTemperature").value(30))
      .andExpect(jsonPath("$.effectiveCare.minHumidity").value(10))
  }

  @Test
  fun `an edit without own care removes them all`() {
    val id = createdId(mapOf("wateringGuideline" to "cada 5 dias"))

    update(id, null).andExpect(status().isOk)

    detail(id)
      .andExpect(jsonPath("$.careOverrides").doesNotExist())
      .andExpect(jsonPath("$.effectiveCare.overridden").value(empty<Any>()))
  }

  @Test
  fun `an empty overrides object is the same as none`() {
    val id = createdId(emptyMap())

    detail(id).andExpect(jsonPath("$.careOverrides").doesNotExist())
  }

  @Test
  fun `an own soil mix that does not exist answers 400 naming the mix and changes nothing`() {
    val id = createdId()

    update(id, mapOf("soilMixId" to "999999999"))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("mezcla")))

    detail(id).andExpect(jsonPath("$.careOverrides").doesNotExist())
  }

  @Test
  fun `the creation response already carries the effective care`() {
    create(mapOf("wateringGuideline" to "cada 5 dias"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.effectiveCare.wateringGuideline").value("cada 5 dias"))
      .andExpect(jsonPath("$.careOverrides.wateringGuideline").value("cada 5 dias"))
  }

  // --- Coherencia ---

  @Test
  fun `an own minimum above the inherited maximum answers 400 naming the humidity`() {
    val id = createdId()

    update(id, mapOf("minHumidity" to 40))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("humedad")))

    detail(id).andExpect(jsonPath("$.careOverrides").doesNotExist())
  }

  @Test
  fun `an own maximum below the inherited minimum answers 400 naming the temperature`() {
    create(mapOf("maxTemperature" to 5))
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("temperatura")))
  }

  @Test
  fun `both own ends coherent with each other are accepted`() {
    create(mapOf("minLightHours" to 2, "maxLightHours" to 4))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.effectiveCare.minLightHours").value(2))
      .andExpect(jsonPath("$.effectiveCare.maxLightHours").value(4))
  }

  @Test
  fun `both own ends inverted answer 400`() {
    create(mapOf("minLightHours" to 8, "maxLightHours" to 4)).andExpect(status().isBadRequest)
  }

  @Test
  fun `values out of scale answer 400`() {
    create(mapOf("maxHumidity" to 120)).andExpect(status().isBadRequest)
    create(mapOf("maxLightHours" to 30)).andExpect(status().isBadRequest)
  }

  @Test
  fun `an incoherent edit changes nothing, not even the nickname`() {
    val id = createdId()

    update(id, mapOf("minHumidity" to 40), nickname = "Otro nombre").andExpect(status().isBadRequest)

    detail(id).andExpect(jsonPath("$.nickname").value("Bola"))
  }

  // --- Cambiar la especie ---

  @Test
  fun `a plant without own care inherits from the new species`() {
    val id = createdId()

    update(id, null, mammillaria).andExpect(status().isOk)

    detail(id)
      .andExpect(jsonPath("$.effectiveCare.minHumidity").value(15))
      .andExpect(jsonPath("$.effectiveCare.maxHumidity").value(40))
  }

  @Test
  fun `own care is kept when the species changes`() {
    val id = createdId(mapOf("wateringGuideline" to "cada 5 dias"))

    update(id, mapOf("wateringGuideline" to "cada 5 dias"), mammillaria).andExpect(status().isOk)

    detail(id)
      .andExpect(jsonPath("$.effectiveCare.wateringGuideline").value("cada 5 dias"))
      .andExpect(jsonPath("$.effectiveCare.minHumidity").value(15))
      .andExpect(jsonPath("$.effectiveCare.overridden").value(containsInAnyOrder("wateringGuideline")))
  }

  @Test
  fun `own values that do not fit the new species answer 400 and the plant keeps its species`() {
    // Humedad mínima propia 28: válida con grusonii (10-30), imposible con una especie cuyo máximo sea 20.
    val narrow = createSpecies("CAT-ESTRECHA", maxHumidity = 20)
    val id = createdId(mapOf("minHumidity" to 28))

    update(id, mapOf("minHumidity" to 28), narrow)
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("no encajan")))

    detail(id).andExpect(jsonPath("$.species.id").value(grusonii))
  }

  // --- Ayudas ---

  private fun speciesBody(watering: String, code: String = "CAT-GRUSS", maxHumidity: Int = 30) = json(
    "code" to code, "scientificName" to "Echinocactus grusonii", "commonName" to "Asiento de suegra",
    "minHumidity" to 10, "maxHumidity" to maxHumidity, "minTemperature" to 10, "maxTemperature" to 35,
    "minLightHours" to 6, "maxLightHours" to 10, "wateringGuideline" to watering, "soilMixId" to "100001",
  )

  private fun createSpecies(code: String, maxHumidity: Int): String {
    val response = mockMvc.perform(
      post("/species").contentType(MediaType.APPLICATION_JSON).content(
        json(
          "code" to code, "scientificName" to "Especie $code", "commonName" to "Común",
          "minHumidity" to 5, "maxHumidity" to maxHumidity, "minTemperature" to 10, "maxTemperature" to 35,
          "minLightHours" to 6, "maxLightHours" to 10, "wateringGuideline" to "cada 10 dias", "soilMixId" to "100001",
        ),
      ),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }
}

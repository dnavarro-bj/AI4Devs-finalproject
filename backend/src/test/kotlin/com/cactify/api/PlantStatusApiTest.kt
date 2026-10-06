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

/** Escenarios de «Cambio de estado y su historial» y de «Un ejemplar archivado sigue consultable». */
class PlantStatusApiTest : AbstractApiIntegrationTest() {

  private fun createPlant(): String {
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to "Bola", "locationId" to "300001", "speciesId" to "200001")),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  private fun changeStatus(id: String, to: String, reason: String? = null): ResultActions {
    val pairs = mutableListOf<Pair<String, Any?>>("status" to to)
    if (reason != null) pairs.add("reason" to reason)
    return mockMvc.perform(
      put("/plants/$id/status").contentType(MediaType.APPLICATION_JSON).content(json(*pairs.toTypedArray())),
    )
  }

  private fun history(id: String, vararg params: Pair<String, String>) =
    mockMvc.perform(get("/plants/$id/status-changes").apply { params.forEach { (k, v) -> param(k, v) } })

  @Test
  fun `moving between statuses in progress answers 200 and records the change`() {
    val id = createPlant()

    changeStatus(id, "cuarentena")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("cuarentena"))

    history(id)
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].fromStatus").value("activa"))
      .andExpect(jsonPath("$.content[0].toStatus").value("cuarentena"))
      .andExpect(jsonPath("$.content[0].occurredAt").isNotEmpty)
  }

  @Test
  fun `moving to a final status keeps the reason`() {
    val id = createPlant()

    changeStatus(id, "vendida", "Vendida a un coleccionista").andExpect(status().isOk)

    history(id)
      .andExpect(jsonPath("$.content[0].toStatus").value("vendida"))
      .andExpect(jsonPath("$.content[0].reason").value("Vendida a un coleccionista"))
  }

  @Test
  fun `the reason is optional`() {
    val id = createPlant()

    changeStatus(id, "enferma").andExpect(status().isOk)

    history(id).andExpect(jsonPath("$.content[0].reason").doesNotExist())
  }

  @Test
  fun `going back to active from a final status with a reason is a correction`() {
    val id = createPlant()
    changeStatus(id, "muerta").andExpect(status().isOk)

    changeStatus(id, "activa", "Era un error al marcarla")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("activa"))

    history(id).andExpect(jsonPath("$.totalElements").value(2))
  }

  @Test
  fun `going back to active from a final status without a reason answers 400`() {
    val id = createPlant()
    changeStatus(id, "muerta").andExpect(status().isOk)

    changeStatus(id, "activa")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(containsString("motivo")))

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.status").value("muerta"))
  }

  @Test
  fun `a transition that is not allowed answers 409 and changes nothing`() {
    val id = createPlant()
    changeStatus(id, "muerta").andExpect(status().isOk)

    changeStatus(id, "vendida", "x")
      .andExpect(status().isConflict)
      .andExpect(jsonPath("$.status").value(409))
      .andExpect(jsonPath("$.message").value(containsString("activa")))

    mockMvc.perform(get("/plants/$id")).andExpect(jsonPath("$.status").value("muerta"))
    history(id).andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `moving to the same status answers 409 and records nothing`() {
    val id = createPlant()

    changeStatus(id, "activa").andExpect(status().isConflict)

    history(id).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a status that does not exist answers 400`() {
    val id = createPlant()

    changeStatus(id, "fantasma").andExpect(status().isBadRequest)
  }

  @Test
  fun `a missing status answers 400`() {
    val id = createPlant()

    mockMvc.perform(
      put("/plants/$id/status").contentType(MediaType.APPLICATION_JSON).content("{}"),
    ).andExpect(status().isBadRequest)
  }

  @Test
  fun `changing the status of a plant that does not exist answers 404`() {
    changeStatus("999999999", "cuarentena")
      .andExpect(status().isNotFound)
      .andExpect(jsonPath("$.status").value(404))
  }

  @Test
  fun `the history of a plant that does not exist answers 404`() {
    history("999999999").andExpect(status().isNotFound)
  }

  @Test
  fun `the history is paginated and goes from the most recent to the oldest`() {
    val id = createPlant()
    changeStatus(id, "cuarentena").andExpect(status().isOk)
    changeStatus(id, "enferma").andExpect(status().isOk)
    changeStatus(id, "vendida").andExpect(status().isOk)

    history(id)
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[0].toStatus").value("vendida"))
      .andExpect(jsonPath("$.content[1].toStatus").value("enferma"))
      .andExpect(jsonPath("$.content[2].toStatus").value("cuarentena"))

    history(id, "size" to "2", "page" to "1")
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.content.length()").value(1))
      .andExpect(jsonPath("$.content[0].toStatus").value("cuarentena"))
  }

  @Test
  fun `a plant without changes has an empty history`() {
    val id = createPlant()

    history(id)
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(0))
      .andExpect(jsonPath("$.content.length()").value(0))
  }

  @Test
  fun `the code does not change with the status`() {
    val id = createPlant()
    val code = objectMapper.readTree(mockMvc.perform(get("/plants/$id")).andReturn().response.contentAsString).get("code").asText()

    changeStatus(id, "perdida").andExpect(status().isOk).andExpect(jsonPath("$.code").value(code))
    changeStatus(id, "activa", "Apareció").andExpect(status().isOk).andExpect(jsonPath("$.code").value(code))
  }

  @Test
  fun `an archived plant is still consultable`() {
    val id = createPlant()
    changeStatus(id, "muerta").andExpect(status().isOk)

    mockMvc.perform(get("/plants/$id"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.status").value("muerta"))
      .andExpect(jsonPath("$.code").isNotEmpty)
  }
}

package com.cactify.api

import com.cactify.locationCode
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Ayudas comunes de los tests de tareas. Las fechas son fijas y cada test que depende de «hoy» envía
 * `today`: el servidor no conoce el día del cliente y los tests tampoco deben conocerlo.
 */
abstract class AbstractTaskApiTest : AbstractTimelineApiTest() {

  protected val today = "2026-10-15"

  /** Un inventario limpio: los códigos y los recuentos de los tests no dependen de lo que sembró la base. */
  @org.junit.jupiter.api.BeforeEach
  fun cleanInventory() = clearPlants()

  protected fun createLocation(name: String, parent: String? = null): String {
    val body = if (parent != null) {
      json("name" to name, "code" to locationCode(name), "parentId" to parent)
    } else {
      json("name" to name, "code" to locationCode(name))
    }
    val response = mockMvc.perform(post("/locations").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  protected fun createPlantIn(location: String, species: String = "200001", nickname: String = "Bola"): String {
    val response = mockMvc.perform(
      post("/plants").contentType(MediaType.APPLICATION_JSON)
        .content(json("nickname" to nickname, "locationId" to location, "speciesId" to species)),
    ).andExpect(status().isCreated).andReturn().response.contentAsString
    return objectMapper.readTree(response).get("id").asText()
  }

  /** El cuerpo de alta con valores por defecto; un `null` en las sustituciones **quita** la clave. */
  protected fun taskBody(vararg overrides: Pair<String, Any?>): String {
    val merged = linkedMapOf<String, Any?>(
      "type" to "riego",
      "title" to "Regar",
      "dueFrom" to "2026-10-15",
      "locationId" to "300001",
    )
    overrides.forEach { (key, value) -> if (value == null) merged.remove(key) else merged[key] = value }
    return objectMapper.writeValueAsString(merged)
  }

  protected fun createTask(vararg overrides: Pair<String, Any?>): ResultActions =
    send("POST", "/tasks", taskBody(*overrides))

  /** Crea la tarea esperando `201` y devuelve su id. */
  protected fun newTask(vararg overrides: Pair<String, Any?>): String =
    idOf(createTask(*overrides).andExpect(status().isCreated))

  protected fun task(id: String): ResultActions = send("GET", "/tasks/$id")

  protected fun tasks(vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(get("/tasks").apply { params.forEach { (k, v) -> param(k, v) } })

  protected fun scope(id: String, vararg params: Pair<String, String>): ResultActions =
    mockMvc.perform(get("/tasks/$id/scope").apply { params.forEach { (k, v) -> param(k, v) } })

  protected fun complete(id: String, vararg pairs: Pair<String, Any?>): ResultActions =
    send("POST", "/tasks/$id/complete", json(*pairs))

  protected fun readTree(result: ResultActions) = objectMapper.readTree(result.andReturn().response.contentAsString)

  /** Los ids de la primera página de un listado, en el orden en que vienen. */
  protected fun idsOf(result: ResultActions): List<String> =
    readTree(result).get("content").map { it.get("id").asText() }
}

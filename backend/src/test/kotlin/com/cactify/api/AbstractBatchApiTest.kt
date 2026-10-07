package com.cactify.api

import org.springframework.test.web.servlet.ResultActions

/**
 * Ayudas comunes de los tests de lotes. Un lote es una operación que escribe en N plantas: los
 * tests crean sus plantas en localizaciones propias para no depender de lo que sembró la base.
 */
abstract class AbstractBatchApiTest : AbstractTaskApiTest() {

  protected val invernadero by lazy { createLocation("Invernadero 2") }
  protected val bandeja by lazy { createLocation("Bandeja A3", invernadero) }

  protected fun plantsScope(vararg ids: String) = mapOf("kind" to "plants", "plantIds" to ids.toList())

  protected fun locationScope(id: String, includeDescendants: Boolean? = null): Map<String, Any?> =
    mapOf("kind" to "location", "locationId" to id, "includeDescendants" to includeDescendants)

  protected fun queryScope(query: String) = mapOf("kind" to "query", "query" to query)

  protected fun preview(scope: Map<String, Any?>, vararg extra: Pair<String, Any?>): ResultActions =
    send("POST", "/batches/preview", json("scope" to scope, *extra))

  /** Aplica un lote; `action` es el par `reading`/`intervention`/`comment` con su cuerpo. */
  protected fun applyBatch(scope: Map<String, Any?>, action: Pair<String, Any?>, vararg extra: Pair<String, Any?>): ResultActions =
    send("POST", "/batches", json("scope" to scope, action, *extra))

  protected fun archive(plant: String, status: String = "vendida") {
    send("PUT", "/plants/$plant/status", json("status" to status, "reason" to "prueba"))
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk)
  }

  protected fun careRecordsOf(plant: String): ResultActions = send("GET", "/plants/$plant/care-records")
}

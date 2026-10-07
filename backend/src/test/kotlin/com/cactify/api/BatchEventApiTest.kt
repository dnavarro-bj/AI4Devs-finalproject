package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals

/** Escenarios de «Registrar una intervención o un comentario por lote» y de la forma de la petición. */
class BatchEventApiTest : AbstractBatchApiTest() {

  @Test
  fun `a pruning on twelve plants leaves one intervention each with the same batch`() {
    val plants = (1..12).map { createPlantIn(invernadero) }

    val batchId = idOf(
      applyBatch(locationScope(invernadero), "intervention" to mapOf("type" to "poda", "notes" to "Raíces"))
        .andExpect(status().isCreated)
        .andExpect(jsonPath("$.action").value("intervencion"))
        .andExpect(jsonPath("$.plantCount").value(12)),
    )

    plants.forEach { plant ->
      timeline(plant, "type" to "intervencion")
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].intervention.type").value("poda"))
        .andExpect(jsonPath("$.content[0].batchId").value(batchId))
        .andExpect(jsonPath("$.content[0].batchSize").value(12))
    }
  }

  @Test
  fun `a transplant carries its pot size`() {
    val plant = createPlantIn(invernadero)

    applyBatch(plantsScope(plant), "intervention" to mapOf("type" to "trasplante", "potSize" to "12 cm")).andExpect(status().isCreated)

    timeline(plant, "type" to "intervencion").andExpect(jsonPath("$.content[0].intervention.potSize").value("12 cm"))
  }

  @Test
  fun `a datum alien to the type is rejected and no plant receives anything`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    applyBatch(locationScope(invernadero), "intervention" to mapOf("type" to "poda", "potSize" to "12 cm")).andExpect(status().isBadRequest)

    plants.forEach { timeline(it).andExpect(jsonPath("$.totalElements").value(0)) }
    assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM batch", Long::class.java))
  }

  @Test
  fun `a soil mix that does not exist is a 400`() {
    createPlantIn(invernadero)

    applyBatch(locationScope(invernadero), "intervention" to mapOf("type" to "sustrato", "soilMixId" to "123456789"))
      .andExpect(status().isBadRequest)
  }

  @Test
  fun `a comment goes to every plant without an edited mark`() {
    val plants = (1..3).map { createPlantIn(invernadero) }

    val batchId = idOf(
      applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "Movidas por la ola de frío"))
        .andExpect(status().isCreated)
        .andExpect(jsonPath("$.action").value("comentario")),
    )

    plants.forEach { plant ->
      timeline(plant, "type" to "comentario")
        .andExpect(jsonPath("$.content[0].comment.text").value("Movidas por la ola de frío"))
        .andExpect(jsonPath("$.content[0].comment.editedAt").doesNotExist())
        .andExpect(jsonPath("$.content[0].batchId").value(batchId))
    }
  }

  @Test
  fun `a blank comment is rejected`() {
    createPlantIn(invernadero)

    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "   ")).andExpect(status().isBadRequest)
  }

  @Test
  fun `a comment of a batch can still be edited on its own like any other`() {
    val plant = createPlantIn(invernadero)
    applyBatch(plantsScope(plant), "comment" to mapOf("text" to "Antes")).andExpect(status().isCreated)
    val commentId = objectMapper.readTree(timeline(plant, "type" to "comentario").andReturn().response.contentAsString)
      .get("content").get(0).get("id").asText()

    send("PUT", "/plants/$plant/comments/$commentId", json("text" to "Después")).andExpect(status().isOk)

    timeline(plant, "type" to "comentario")
      .andExpect(jsonPath("$.content[0].comment.text").value("Después"))
      .andExpect(jsonPath("$.content[0].batchSize").value(1))
  }

  @Test
  fun `a single plant batch still counts as a batch`() {
    val plant = createPlantIn(invernadero)

    applyBatch(plantsScope(plant), "comment" to mapOf("text" to "Una")).andExpect(status().isCreated).andExpect(jsonPath("$.plantCount").value(1))
  }

  @Test
  fun `exactly one action is required`() {
    createPlantIn(invernadero)

    applyBatch(locationScope(invernadero), "reading" to null).andExpect(status().isBadRequest)
    send(
      "POST", "/batches",
      json("scope" to locationScope(invernadero), "reading" to mapOf("waterAmountMl" to 1), "comment" to mapOf("text" to "x")),
    ).andExpect(status().isBadRequest)
  }

  @Test
  fun `an empty scope or all plants excluded is a 400 and creates nothing`() {
    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "Nada")).andExpect(status().isBadRequest)

    val plants = (1..2).map { createPlantIn(invernadero) }
    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "Nada"), "excludedPlantIds" to plants).andExpect(status().isBadRequest)

    assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM batch", Long::class.java))
  }

  @Test
  fun `archived plants never receive a record`() {
    val sold = createPlantIn(invernadero)
    val kept = createPlantIn(invernadero)
    archive(sold)

    applyBatch(locationScope(invernadero), "comment" to mapOf("text" to "Solo en curso"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.plantCount").value(1))

    timeline(sold, "type" to "comentario").andExpect(jsonPath("$.totalElements").value(0))
    timeline(kept, "type" to "comentario").andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `a batch by query records the query kind and reaches every plant of the filter`() {
    repeat(5) { createPlantIn(invernadero, species = "200002") }
    val other = createPlantIn(invernadero, species = "200001")

    applyBatch(queryScope("species=200002"), "comment" to mapOf("text" to "Mammillarias"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.scopeKind").value("consulta"))
      .andExpect(jsonPath("$.plantCount").value(5))

    timeline(other, "type" to "comentario").andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `an individual intervention or comment carries no batch`() {
    val plant = createPlantIn(invernadero)

    addComment(plant, "Suelta").andExpect(status().isCreated).andExpect(jsonPath("$.batchId").doesNotExist())
    send("POST", "/plants/$plant/comments", json("text" to "Con lote falso", "batchId" to "123456"))
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.batchId").doesNotExist())
    addIntervention(plant, "poda").andExpect(status().isCreated).andExpect(jsonPath("$.batchId").doesNotExist())
  }
}

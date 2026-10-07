package com.cactify.api

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Escenarios de «Comentarios cronológicos» y «Corregir y retirar un comentario». */
class PlantCommentApiTest : AbstractTimelineApiTest() {

  @Test
  fun `adding a comment answers 201 and it is the first entry`() {
    val plant = createPlant()

    addComment(plant, "Pequeña marca en el lado oeste")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.type").value("comentario"))
      .andExpect(jsonPath("$.comment.text").value("Pequeña marca en el lado oeste"))
      .andExpect(jsonPath("$.occurredAt").isNotEmpty)

    timeline(plant).andExpect(jsonPath("$.content[0].type").value("comentario"))
  }

  @Test
  fun `a comment with a past date takes its place in time`() {
    val plant = createPlant()
    addComment(plant, "Antiguo", daysAgo(21)).andExpect(status().isCreated)
    addComment(plant, "Reciente").andExpect(status().isCreated)

    timeline(plant)
      .andExpect(jsonPath("$.content[0].comment.text").value("Reciente"))
      .andExpect(jsonPath("$.content[1].comment.text").value("Antiguo"))
  }

  @Test
  fun `a comment without text answers 400`() {
    val plant = createPlant()

    addComment(plant, "   ").andExpect(status().isBadRequest)
    send("POST", "/plants/$plant/comments", "{}").andExpect(status().isBadRequest)
    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a future date answers 400`() {
    val plant = createPlant()

    addComment(plant, "Del futuro", daysAgo(-2)).andExpect(status().isBadRequest)
  }

  @Test
  fun `a comment does not touch the description`() {
    val plant = createPlant()

    addComment(plant).andExpect(status().isCreated)

    send("GET", "/plants/$plant").andExpect(jsonPath("$.description").doesNotExist())
  }

  @Test
  fun `a comment on an archived plant is accepted`() {
    val plant = createPlant()
    send("PUT", "/plants/$plant/status", json("status" to "muerta")).andExpect(status().isOk)

    addComment(plant, "Se quedó en el recuerdo").andExpect(status().isCreated)
  }

  @Test
  fun `correcting a comment marks it edited and keeps its instant`() {
    val plant = createPlant()
    val at = daysAgo(5)
    val created = addComment(plant, "Original", at)
    val id = idOf(created)
    val occurredAt = objectMapper.readTree(created.andReturn().response.contentAsString).get("occurredAt").asText()

    send("PUT", "/plants/$plant/comments/$id", json("text" to "Corregido"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.comment.text").value("Corregido"))
      .andExpect(jsonPath("$.comment.editedAt").isNotEmpty)
      .andExpect(jsonPath("$.occurredAt").value(occurredAt))
  }

  @Test
  fun `a comment never corrected carries no editedAt`() {
    val plant = createPlant()
    addComment(plant).andExpect(status().isCreated)

    timeline(plant).andExpect(jsonPath("$.content[0].comment.editedAt").doesNotExist())
  }

  @Test
  fun `correcting with blank text answers 400 and keeps the text`() {
    val plant = createPlant()
    val id = idOf(addComment(plant, "Original"))

    send("PUT", "/plants/$plant/comments/$id", json("text" to " ")).andExpect(status().isBadRequest)

    timeline(plant).andExpect(jsonPath("$.content[0].comment.text").value("Original"))
  }

  @Test
  fun `removing a comment answers 204 and it disappears`() {
    val plant = createPlant()
    val id = idOf(addComment(plant))

    send("DELETE", "/plants/$plant/comments/$id").andExpect(status().isNoContent)

    timeline(plant).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `a comment of another plant answers 404 and does not change`() {
    val owner = createPlant()
    val other = createPlant()
    val id = idOf(addComment(owner, "Mío"))

    send("PUT", "/plants/$other/comments/$id", json("text" to "Robado")).andExpect(status().isNotFound)
    send("DELETE", "/plants/$other/comments/$id").andExpect(status().isNotFound)

    timeline(owner).andExpect(jsonPath("$.content[0].comment.text").value("Mío"))
  }

  @Test
  fun `a missing plant answers 404`() {
    addComment("999999999").andExpect(status().isNotFound)
  }

  @Test
  fun `an event of another kind is not a comment`() {
    val plant = createPlant()
    val bloom = idOf(addBloom(plant))

    send("DELETE", "/plants/$plant/comments/$bloom").andExpect(status().isNotFound)
  }
}

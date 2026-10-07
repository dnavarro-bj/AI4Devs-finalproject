package com.cactify.api

import com.cactify.application.ports.MediaStorage
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Una fotografía puede colgar de un evento de la cronología». */
class PlantPhotoEventApiTest : AbstractMediaApiTest() {

  @Autowired
  lateinit var storage: MediaStorage

  private fun photosPath(plant: String) = "/plants/$plant/photos"

  private fun completedTaskEvent(plant: String): String {
    val task = idOf(
      send(
        "POST", "/tasks",
        json("type" to "riego", "title" to "Regar", "dueFrom" to "2026-10-15", "plantIds" to listOf(plant)),
      ).andExpect(status().isCreated),
    )
    send("POST", "/tasks/$task/complete", json()).andExpect(status().isOk)
    return body(timeline(plant, "type" to "tarea")).get("content").get(0).get("id").asText()
  }

  @Test
  fun `a photo hangs from a comment`() {
    val plant = createPlant()
    val comment = idOf(addComment(plant, "Nueva espinación"))

    val id = plantPhotos(plant, 1, "eventId" to comment).single()

    send("GET", "${photosPath(plant)}?event=$comment")
      .andExpect(jsonPath("$.content[0].id").value(id))
      .andExpect(jsonPath("$.content[0].eventId").value(comment))
  }

  @Test
  fun `a photo hangs from an intervention a bloom and a completed task`() {
    val plant = createPlant()
    val intervention = idOf(addIntervention(plant, "poda"))
    val bloom = idOf(addBloom(plant))
    val task = completedTaskEvent(plant)

    listOf(intervention, bloom, task).forEach { event ->
      uploadToPlant(plant, listOf(smallJpeg()), "eventId" to event)
        .andExpect(status().isCreated)
        .andExpect(jsonPath("$[0].eventId").value(event))
    }
  }

  @Test
  fun `an event of another plant answers 400 and stores nothing`() {
    val mine = createPlant()
    val other = createPlant()
    val foreignEvent = idOf(addComment(other))
    val before = storage.listFolders("media").size

    uploadToPlant(mine, listOf(smallJpeg()), "eventId" to foreignEvent).andExpect(status().isBadRequest)

    assertEquals(before, storage.listFolders("media").size)
    send("GET", photosPath(mine)).andExpect(jsonPath("$.totalElements").value(0))
  }

  @Test
  fun `an unknown event and a reading answer 400`() {
    val plant = createPlant()
    val reading = idOf(send("POST", "/plants/$plant/care-records", json("humidity" to 30)).andExpect(status().isCreated))

    uploadToPlant(plant, listOf(smallJpeg()), "eventId" to "123456789").andExpect(status().isBadRequest)
    uploadToPlant(plant, listOf(smallJpeg()), "eventId" to reading).andExpect(status().isBadRequest)
    uploadToPlant(plant, listOf(smallJpeg()), "eventId" to "no-es-un-id").andExpect(status().isBadRequest)
  }

  @Test
  fun `a status change cannot carry a photo`() {
    val plant = createPlant()
    send("PUT", "/plants/$plant/status", json("status" to "cuarentena")).andExpect(status().isOk)
    val change = body(timeline(plant, "type" to "cambio_estado")).get("content").get(0).get("id").asText()

    uploadToPlant(plant, listOf(smallJpeg()), "eventId" to change).andExpect(status().isBadRequest)
  }

  @Test
  fun `deleting the event keeps the photo without event and its files`() {
    val plant = createPlant()
    val comment = idOf(addComment(plant))
    val photo = plantPhotos(plant, 1, "eventId" to comment).single()
    entityManager.flush()
    entityManager.clear()

    send("DELETE", "/plants/$plant/comments/$comment").andExpect(status().isNoContent)
    entityManager.flush()
    entityManager.clear()

    send("GET", photosPath(plant))
      .andExpect(jsonPath("$.totalElements").value(1))
      .andExpect(jsonPath("$.content[0].id").value(photo))
      .andExpect(jsonPath("$.content[0].eventId").value(null as Any?))
    assertTrue(storage.exists("media/$photo/full"))
    send("GET", "/media/$photo/thumb").andExpect(status().isOk)
  }

  @Test
  fun `an existing photo can be hung from an event and unhung by correcting it`() {
    val plant = createPlant()
    val photo = plantPhotos(plant, 1).single()
    val comment = idOf(addComment(plant))

    send("PUT", "${photosPath(plant)}/$photo", json("eventId" to comment))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.eventId").value(comment))
    assertEquals(listOf(photo), listIds("${photosPath(plant)}?event=$comment"))

    send("PUT", "${photosPath(plant)}/$photo", """{"eventId": null}""")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.eventId").value(null as Any?))
    assertEquals(emptyList(), listIds("${photosPath(plant)}?event=$comment"))
    send("GET", photosPath(plant)).andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `correcting a photo with the event of another plant answers 400`() {
    val plant = createPlant()
    val photo = plantPhotos(plant, 1).single()
    val foreign = idOf(addComment(createPlant()))

    send("PUT", "${photosPath(plant)}/$photo", json("eventId" to foreign)).andExpect(status().isBadRequest)
  }
}

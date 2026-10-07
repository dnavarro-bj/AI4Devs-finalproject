package com.cactify.api

import com.cactify.application.PlantTimelineService
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.assertEquals

/** Escenarios de «Las fotografías de un evento en la cronología». */
class TimelinePhotosApiTest : AbstractMediaApiTest() {

  @Autowired
  lateinit var timelineService: PlantTimelineService

  private fun photosOf(plant: String, type: String) = timeline(plant, "type" to type).andExpect(status().isOk)

  private fun at(daysAgo: Long): String = Instant.now().minus(daysAgo, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS).toString()

  @Test
  fun `a comment with two photos carries both in photos`() {
    val plant = createPlant()
    val comment = idOf(addComment(plant, "Nueva espinación"))
    val ids = plantPhotos(plant, 2, "eventId" to comment)

    photosOf(plant, "comentario")
      .andExpect(jsonPath("$.content[0].photos.length()").value(2))
      .andExpect(jsonPath("$.content[0].photos[*].id", org.hamcrest.Matchers.containsInAnyOrder(ids[0], ids[1])))
      .andExpect(jsonPath("$.content[0].photos[0].altText").isString)
      .andExpect(jsonPath("$.content[0].photos[0].width").value(320))
      .andExpect(jsonPath("$.content[0].photos[0].urls.thumb").value(org.hamcrest.Matchers.startsWith("/media/")))
  }

  @Test
  fun `interventions blooms and completed tasks carry their photos too`() {
    val plant = createPlant()
    val intervention = idOf(addIntervention(plant, "poda"))
    val bloom = idOf(addBloom(plant))
    val task = idOf(
      send("POST", "/tasks", json("type" to "riego", "title" to "Regar", "dueFrom" to "2026-10-15", "plantIds" to listOf(plant)))
        .andExpect(status().isCreated),
    )
    send("POST", "/tasks/$task/complete", json()).andExpect(status().isOk)
    val taskEvent = body(timeline(plant, "type" to "tarea")).get("content").get(0).get("id").asText()
    listOf(intervention, bloom, taskEvent).forEach { plantPhotos(plant, 1, "eventId" to it) }

    listOf("intervencion", "floracion", "tarea").forEach { type ->
      photosOf(plant, type).andExpect(jsonPath("$.content[0].photos.length()").value(1))
    }
  }

  @Test
  fun `an event without photos omits the field`() {
    val plant = createPlant()
    addBloom(plant).andExpect(status().isCreated)

    photosOf(plant, "floracion").andExpect(jsonPath("$.content[0].photos").doesNotExist())
  }

  @Test
  fun `readings status changes and movements never carry photos`() {
    val plant = createPlant()
    send("POST", "/plants/$plant/care-records", json("humidity" to 30)).andExpect(status().isCreated)
    send("PUT", "/plants/$plant/status", json("status" to "cuarentena")).andExpect(status().isOk)
    send("PUT", "/plants/$plant", json("nickname" to "Bola", "locationId" to "300002", "speciesId" to "200001")).andExpect(status().isOk)
    plantPhotos(plant, 2)

    timeline(plant)
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.content[*].photos").value(org.hamcrest.Matchers.hasSize<Any>(0)))
  }

  @Test
  fun `the photos of an event come ordered by capture date`() {
    val plant = createPlant()
    val comment = idOf(addComment(plant))
    val recent = plantPhotos(plant, 1, "eventId" to comment, "capturedAt" to at(2)).single()
    val old = plantPhotos(plant, 1, "eventId" to comment, "capturedAt" to at(40)).single()

    photosOf(plant, "comentario")
      .andExpect(jsonPath("$.content[0].photos[*].id", org.hamcrest.Matchers.contains(old, recent)))
  }

  @Test
  fun `a photo uploaded afterwards shows up when the timeline is requested again`() {
    val plant = createPlant()
    val comment = idOf(addComment(plant))
    photosOf(plant, "comentario").andExpect(jsonPath("$.content[0].photos").doesNotExist())

    val id = plantPhotos(plant, 1, "eventId" to comment).single()

    photosOf(plant, "comentario").andExpect(jsonPath("$.content[0].photos[0].id").value(id))
  }

  @Test
  fun `a photo that was unhung leaves the entry`() {
    val plant = createPlant()
    val comment = idOf(addComment(plant))
    val id = plantPhotos(plant, 1, "eventId" to comment).single()

    send("PUT", "/plants/$plant/photos/$id", """{"eventId": null}""").andExpect(status().isOk)

    photosOf(plant, "comentario").andExpect(jsonPath("$.content[0].photos").doesNotExist())
  }

  @Test
  fun `correcting an event answers with its photos and creating one without`() {
    val plant = createPlant()
    addComment(plant, "Original")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.photos").doesNotExist())
    val comment = idOf(addComment(plant, "Segunda"))
    val photo = plantPhotos(plant, 1, "eventId" to comment).single()

    send("PUT", "/plants/$plant/comments/$comment", json("text" to "Corregida"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.comment.text").value("Corregida"))
      .andExpect(jsonPath("$.photos[0].id").value(photo))

    val intervention = idOf(addIntervention(plant, "poda"))
    plantPhotos(plant, 1, "eventId" to intervention)
    send("PUT", "/plants/$plant/interventions/$intervention", json("type" to "poda"))
      .andExpect(jsonPath("$.photos.length()").value(1))
    val bloom = idOf(addBloom(plant))
    plantPhotos(plant, 1, "eventId" to bloom)
    send("PUT", "/plants/$plant/blooms/$bloom", json("startedOn" to dateDaysAgo(10).toString(), "status" to "en_flor"))
      .andExpect(jsonPath("$.photos.length()").value(1))
  }

  @Test
  fun `the photos of a whole page cost one query and not one per event`() {
    val withPhotos = createPlant()
    val withoutPhotos = createPlant()
    repeat(8) { i ->
      val c1 = idOf(addComment(withPhotos, "Con foto $i"))
      plantPhotos(withPhotos, 2, "eventId" to c1)
      addComment(withoutPhotos, "Sin foto $i")
    }
    entityManager.flush()
    entityManager.clear()
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true

    statistics.clear()
    val withoutEntries = timelineService.timeline(withoutPhotos, emptySet(), PageRequest.of(0, 20))
    val baseline = statistics.prepareStatementCount
    entityManager.clear()
    statistics.clear()
    val withEntries = timelineService.timeline(withPhotos, emptySet(), PageRequest.of(0, 20))
    val measured = statistics.prepareStatementCount

    assertEquals(8, withoutEntries.content.size)
    assertEquals(8, withEntries.content.size)
    assertEquals(true, withEntries.content.all { it.photos?.size == 2 })
    assertEquals(baseline, measured, "las fotos de la página no suman consultas por evento: $measured frente a $baseline")
  }
}

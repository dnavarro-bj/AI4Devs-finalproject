package com.cactify.api

import com.cactify.application.ports.MediaStorage
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.assertEquals

/** Escenarios de «Galería fotográfica de un ejemplar» y «Corregir, elegir principal, reordenar y borrar en el ejemplar». */
class PlantPhotoApiTest : AbstractMediaApiTest() {

  @Autowired
  lateinit var storage: MediaStorage

  private fun photosPath(plant: String) = "/plants/$plant/photos"

  private fun at(daysAgo: Long): String = Instant.now().minus(daysAgo, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS).toString()

  @Test
  fun `a plant without photos is valid and has an empty gallery`() {
    val plant = createPlant()

    send("GET", photosPath(plant)).andExpect(status().isOk).andExpect(jsonPath("$.totalElements").value(0))
    send("GET", "/plants/$plant").andExpect(status().isOk)
  }

  @Test
  fun `photos can be added after the creation and the first is the primary`() {
    val plant = createPlant()

    val ids = plantPhotos(plant, 2)

    assertEquals(setOf(ids[0]), primaries(photosPath(plant)).toSet())
    send("GET", "${photosPath(plant)}?sort=position")
      .andExpect(jsonPath("$.content[*].id").value(ids))
      .andExpect(jsonPath("$.content[0].eventId").value(null as Any?))
      .andExpect(jsonPath("$.content[0].purpose").value(null as Any?))
  }

  @Test
  fun `the entry gives dimensions and the relative paths of its variants`() {
    val plant = createPlant()

    val result = uploadToPlant(plant).andExpect(status().isCreated)
    val id = idsOf(result).single()

    result
      .andExpect(jsonPath("$[0].width").value(320))
      .andExpect(jsonPath("$[0].urls.thumb").value("/media/$id/thumb"))
      .andExpect(jsonPath("$[0].urls.full").value("/media/$id/full"))
      .andExpect(jsonPath("$[0].credit").doesNotExist())
  }

  @Test
  fun `without an alt text it carries the nickname and the code of the plant`() {
    val plant = createPlant()
    val code = body(send("GET", "/plants/$plant")).get("code").asText()

    uploadToPlant(plant)
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$[0].altText").value(org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("Bola"), org.hamcrest.Matchers.containsString(code))))
  }

  @Test
  fun `an archived plant accepts photos`() {
    val plant = createPlant()
    send("PUT", "/plants/$plant/status", json("status" to "muerta")).andExpect(status().isOk)

    uploadToPlant(plant).andExpect(status().isCreated)
  }

  @Test
  fun `the purpose is kept and an unknown one answers 400 naming the valid ones`() {
    val plant = createPlant()

    uploadToPlant(plant, listOf(smallJpeg()), "purpose" to "etiqueta_fisica")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$[0].purpose").value("etiqueta_fisica"))
    uploadToPlant(plant, listOf(smallJpeg()), "purpose" to "selfie")
      .andExpect(status().isBadRequest)
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("etiqueta_fisica")))
    send("GET", photosPath(plant)).andExpect(jsonPath("$.totalElements").value(1))
  }

  @Test
  fun `the default order is the evolution newest capture first and without a capture date by upload date`() {
    val plant = createPlant()
    val april = plantPhotos(plant, 1, "capturedAt" to at(120)).single()
    val august = plantPhotos(plant, 1, "capturedAt" to at(10)).single()
    val june = plantPhotos(plant, 1, "capturedAt" to at(60)).single()
    val undated = plantPhotos(plant, 1).single()

    assertEquals(listOf(undated, august, june, april), listIds(photosPath(plant)))
  }

  @Test
  fun `the manual order is asked with sort position`() {
    val plant = createPlant()
    val first = plantPhotos(plant, 1, "capturedAt" to at(120)).single()
    val second = plantPhotos(plant, 1, "capturedAt" to at(10)).single()

    assertEquals(listOf(first, second), listIds("${photosPath(plant)}?sort=position"))
    assertEquals(listOf(second, first), listIds(photosPath(plant)))
    send("GET", "${photosPath(plant)}?sort=altText").andExpect(status().isBadRequest)
  }

  @Test
  fun `the listing filters by purpose and by event`() {
    val plant = createPlant()
    val detail = plantPhotos(plant, 1, "purpose" to "detalle").single()
    plantPhotos(plant, 1, "purpose" to "general")
    val comment = idOf(addComment(plant))
    val attached = plantPhotos(plant, 1, "eventId" to comment).single()

    assertEquals(listOf(detail), listIds("${photosPath(plant)}?purpose=detalle"))
    assertEquals(listOf(attached), listIds("${photosPath(plant)}?event=$comment"))
    send("GET", "${photosPath(plant)}?purpose=selfie").andExpect(status().isBadRequest)
  }

  @Test
  fun `correcting the capture date moves the photo in the evolution`() {
    val plant = createPlant()
    val old = plantPhotos(plant, 1, "capturedAt" to at(100)).single()
    val recent = plantPhotos(plant, 1, "capturedAt" to at(10)).single()
    assertEquals(listOf(recent, old), listIds(photosPath(plant)))

    send("PUT", "${photosPath(plant)}/$old", json("capturedAt" to at(2))).andExpect(status().isOk)

    assertEquals(listOf(old, recent), listIds(photosPath(plant)))
  }

  @Test
  fun `alt text and purpose can be corrected and the purpose cleared`() {
    val plant = createPlant()
    val id = plantPhotos(plant, 1).single()

    send("PUT", "${photosPath(plant)}/$id", json("altText" to "Espinas nuevas", "purpose" to "detalle"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.altText").value("Espinas nuevas"))
      .andExpect(jsonPath("$.purpose").value("detalle"))
    send("PUT", "${photosPath(plant)}/$id", """{"purpose": null}""")
      .andExpect(jsonPath("$.purpose").value(null as Any?))
      .andExpect(jsonPath("$.altText").value("Espinas nuevas"))
    send("PUT", "${photosPath(plant)}/$id", json("purpose" to "selfie")).andExpect(status().isBadRequest)
    send("PUT", "${photosPath(plant)}/$id", json("altText" to " ")).andExpect(status().isBadRequest)
  }

  @Test
  fun `choosing the primary makes it the only one and unmarking answers 400`() {
    val plant = createPlant()
    val (a, b) = plantPhotos(plant, 2)

    send("PUT", "${photosPath(plant)}/$a", json("primary" to false)).andExpect(status().isBadRequest)
    send("PUT", "${photosPath(plant)}/$b", json("primary" to true)).andExpect(status().isOk).andExpect(jsonPath("$.primary").value(true))

    assertEquals(listOf(b), primaries(photosPath(plant)))
  }

  @Test
  fun `deleting the primary promotes the next one by manual order`() {
    val plant = createPlant()
    val (a, b, c) = plantPhotos(plant, 3)

    send("DELETE", "${photosPath(plant)}/$a").andExpect(status().isNoContent)

    assertEquals(listOf(b, c), listIds("${photosPath(plant)}?sort=position"))
    assertEquals(listOf(b), primaries(photosPath(plant)))
  }

  @Test
  fun `reordering rewrites the manual order and demands the exact set`() {
    val plant = createPlant()
    val (a, b, c) = plantPhotos(plant, 3)

    send("PUT", "${photosPath(plant)}/order", json("ids" to listOf(b, a))).andExpect(status().isBadRequest)
    send("PUT", "${photosPath(plant)}/order", json("ids" to listOf(c, b, a)))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$[*].id", org.hamcrest.Matchers.contains(c, b, a)))

    assertEquals(listOf(c, b, a), listIds("${photosPath(plant)}?sort=position"))
  }

  @Test
  fun `a photo of another plant answers 404 and does not change`() {
    val mine = createPlant()
    val other = createPlant()
    val foreign = plantPhotos(other, 1).single()

    send("PUT", "${photosPath(mine)}/$foreign", json("altText" to "Robada")).andExpect(status().isNotFound)
    send("DELETE", "${photosPath(mine)}/$foreign").andExpect(status().isNotFound)

    assertEquals(listOf(foreign), listIds(photosPath(other)))
  }

  @Test
  fun `the photos of the species do not show up in the plant and the other way round`() {
    val plant = createPlant()
    val own = plantPhotos(plant, 1).single()
    speciesPhotos(2)

    assertEquals(listOf(own), listIds(photosPath(plant)))
  }

  @Test
  fun `an unknown plant answers 404 and a gallery of 50 answers 409`() {
    uploadToPlant("999999999").andExpect(status().isNotFound)
    send("GET", photosPath("999999999")).andExpect(status().isNotFound)

    val plant = createPlant()
    seedPlantGallery(plant, 50)
    val before = storage.listFolders("media").size
    uploadToPlant(plant).andExpect(status().isConflict)
    assertEquals(before, storage.listFolders("media").size)
  }
}

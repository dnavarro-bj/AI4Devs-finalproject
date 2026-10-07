package com.cactify.api

import com.cactify.application.ports.MediaStorage
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Escenarios de «Galería de referencia de una especie» y «Corregir, elegir portada, reordenar y borrar». */
class SpeciesPhotoApiTest : AbstractMediaApiTest() {

  @Autowired
  lateinit var storage: MediaStorage

  private fun photosPath(species: String = speciesId) = "/species/$species/photos"

  @Test
  fun `the first photo is the primary and the entry carries its facts`() {
    uploadToSpecies()
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$.length()").value(1))
      .andExpect(jsonPath("$[0].id").isString)
      .andExpect(jsonPath("$[0].primary").value(true))
      .andExpect(jsonPath("$[0].position").value(0))
      .andExpect(jsonPath("$[0].width").value(320))
      .andExpect(jsonPath("$[0].height").value(240))
      .andExpect(jsonPath("$[0].contentType").value("image/jpeg"))
      .andExpect(jsonPath("$[0].createdAt").isNotEmpty)
      .andExpect(jsonPath("$[0].capturedAt").value(null as Any?))
      .andExpect(jsonPath("$[0].credit").value(null as Any?))
  }

  @Test
  fun `the entry gives the relative paths of its three variants`() {
    val result = uploadToSpecies().andExpect(status().isCreated)
    val id = idsOf(result).single()

    result
      .andExpect(jsonPath("$[0].urls.thumb").value("/media/$id/thumb"))
      .andExpect(jsonPath("$[0].urls.medium").value("/media/$id/medium"))
      .andExpect(jsonPath("$[0].urls.full").value("/media/$id/full"))
  }

  @Test
  fun `several photos in one upload come back in the order received and only the first is primary`() {
    val ids = speciesPhotos(4)

    assertEquals(4, ids.size)
    assertEquals(ids, listIds(photosPath()))
    assertEquals(listOf(ids[0]), primaries(photosPath()))
    send("GET", photosPath()).andExpect(jsonPath("$.content[*].position", org.hamcrest.Matchers.contains(0, 1, 2, 3)))
  }

  @Test
  fun `without an alt text the entry gets one with the name of the species`() {
    uploadToSpecies()
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$[0].altText").value(org.hamcrest.Matchers.containsString("Echinocactus grusonii")))
  }

  @Test
  fun `an own alt text and credit are kept`() {
    uploadToSpecies(speciesId, listOf(smallJpeg()), "altText" to "Flor amarilla de mayo", "credit" to "Colección propia")
      .andExpect(status().isCreated)
      .andExpect(jsonPath("$[0].altText").value("Flor amarilla de mayo"))
      .andExpect(jsonPath("$[0].credit").value("Colección propia"))
  }

  @Test
  fun `the listing is a page with the envelope`() {
    speciesPhotos(3)

    send("GET", "${photosPath()}?size=2&page=1")
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.totalElements").value(3))
      .andExpect(jsonPath("$.totalPages").value(2))
      .andExpect(jsonPath("$.pageNumber").value(1))
      .andExpect(jsonPath("$.pageSize").value(2))
      .andExpect(jsonPath("$.content.length()").value(1))
  }

  @Test
  fun `the photos of a plant never show up in the gallery of its species`() {
    val plant = createPlant()
    plantPhotos(plant, 2)
    val speciesOnes = speciesPhotos(1)

    assertEquals(speciesOnes, listIds(photosPath()))
  }

  @Test
  fun `an unknown species answers 404 on upload and listing`() {
    uploadToSpecies("999999999").andExpect(status().isNotFound)
    send("GET", photosPath("999999999")).andExpect(status().isNotFound)
  }

  @Test
  fun `a species with 50 photos admits no more and nothing is stored`() {
    seedSpeciesGallery(speciesId, 50)
    val before = storage.listFolders("media").size

    uploadToSpecies().andExpect(status().isConflict)

    assertEquals(before, storage.listFolders("media").size)
    send("GET", photosPath()).andExpect(jsonPath("$.totalElements").value(50))
  }

  @Test
  fun `choosing the cover makes it the only primary`() {
    val (a, b, _) = speciesPhotos(3)

    send("PUT", "${photosPath()}/$b", json("primary" to true))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.id").value(b))
      .andExpect(jsonPath("$.primary").value(true))

    assertEquals(listOf(b), primaries(photosPath()))
    assertTrue(a != b)
  }

  @Test
  fun `unmarking the primary answers 400 and changes nothing`() {
    val (a, _) = speciesPhotos(2)

    send("PUT", "${photosPath()}/$a", json("primary" to false)).andExpect(status().isBadRequest)

    assertEquals(listOf(a), primaries(photosPath()))
  }

  @Test
  fun `reordering sets the listing order`() {
    val (a, b, c) = speciesPhotos(3)

    send("PUT", "${photosPath()}/order", json("ids" to listOf(c, a, b)))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$[*].id", org.hamcrest.Matchers.contains(c, a, b)))

    assertEquals(listOf(c, a, b), listIds(photosPath()))
    assertEquals(listOf(a), primaries(photosPath()), "reordenar no cambia la portada")
  }

  @Test
  fun `an incomplete or foreign order answers 400 and the order does not change`() {
    val ids = speciesPhotos(3)
    val (a, b, _) = ids
    val foreign = speciesPhotos(1, otherSpeciesId).single()

    send("PUT", "${photosPath()}/order", json("ids" to listOf(b, a))).andExpect(status().isBadRequest)
    send("PUT", "${photosPath()}/order", json("ids" to ids + foreign)).andExpect(status().isBadRequest)
    send("PUT", "${photosPath()}/order", json("ids" to listOf(a, b, foreign))).andExpect(status().isBadRequest)

    assertEquals(ids, listIds(photosPath()))
  }

  @Test
  fun `deleting the cover promotes the next one in the order`() {
    val (a, b, c) = speciesPhotos(3)

    send("DELETE", "${photosPath()}/$a").andExpect(status().isNoContent)

    assertEquals(listOf(b, c), listIds(photosPath()))
    assertEquals(listOf(b), primaries(photosPath()))
  }

  @Test
  fun `deleting the only photo leaves the gallery empty`() {
    val a = speciesPhotos(1).single()

    send("DELETE", "${photosPath()}/$a").andExpect(status().isNoContent)

    send("GET", photosPath()).andExpect(jsonPath("$.totalElements").value(0))
    send("GET", "/media/$a/thumb").andExpect(status().isNotFound)
  }

  @Test
  fun `a blank alt text answers 400 and keeps the previous one`() {
    val a = speciesPhotos(1).single()
    send("PUT", "${photosPath()}/$a", json("altText" to "Flor")).andExpect(status().isOk)

    send("PUT", "${photosPath()}/$a", json("altText" to "   ")).andExpect(status().isBadRequest)

    send("GET", photosPath()).andExpect(jsonPath("$.content[0].altText").value("Flor"))
  }

  @Test
  fun `credit and capture date can be corrected and cleared`() {
    val a = speciesPhotos(1).single()

    send("PUT", "${photosPath()}/$a", json("credit" to "Vivero Sol", "capturedAt" to "2026-05-01T08:00:00Z"))
      .andExpect(status().isOk)
      .andExpect(jsonPath("$.credit").value("Vivero Sol"))
      .andExpect(jsonPath("$.capturedAt").value("2026-05-01T08:00:00Z"))
    send("PUT", "${photosPath()}/$a", json("altText" to "Otra"))
      .andExpect(jsonPath("$.credit").value("Vivero Sol"))
    send("PUT", "${photosPath()}/$a", """{"credit": null, "capturedAt": null}""")
      .andExpect(jsonPath("$.credit").value(null as Any?))
      .andExpect(jsonPath("$.capturedAt").value(null as Any?))
  }

  @Test
  fun `a photo of another species answers 404 on correct and delete and does not change`() {
    val foreign = speciesPhotos(1, otherSpeciesId).single()

    send("PUT", "${photosPath()}/$foreign", json("altText" to "Robada")).andExpect(status().isNotFound)
    send("DELETE", "${photosPath()}/$foreign").andExpect(status().isNotFound)

    send("GET", photosPath(otherSpeciesId)).andExpect(jsonPath("$.content[0].altText").value(org.hamcrest.Matchers.not("Robada")))
    assertEquals(listOf(foreign), listIds(photosPath(otherSpeciesId)))
  }
}

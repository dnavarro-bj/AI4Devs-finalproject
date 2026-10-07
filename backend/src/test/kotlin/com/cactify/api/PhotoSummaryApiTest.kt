package com.cactify.api

import com.cactify.application.PlantService
import com.cactify.application.PlantCriteria
import com.cactify.application.SpeciesCriteria
import com.cactify.application.SpeciesService
import com.cactify.application.ports.MediaStorage
import org.hibernate.SessionFactory
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.test.context.transaction.TestTransaction
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Escenarios de «Portada y recuento de fotografías» de la especie y del ejemplar. */
class PhotoSummaryApiTest : AbstractMediaApiTest() {

  @Autowired
  lateinit var storage: MediaStorage

  @Autowired
  lateinit var speciesService: SpeciesService

  @Autowired
  lateinit var plantService: PlantService

  private fun newSpecies(name: String, code: String): String =
    idOf(
      send(
        "POST", "/species",
        json(
          "code" to code, "scientificName" to name, "commonName" to name,
          "minHumidity" to 10, "maxHumidity" to 30, "minTemperature" to 10, "maxTemperature" to 35,
          "minLightHours" to 6, "maxLightHours" to 10, "wateringGuideline" to "cada 10 dias", "soilMixId" to "100001",
        ),
      ).andExpect(status().isCreated),
    )

  private fun row(path: String, id: String) =
    body(send("GET", path).andExpect(status().isOk)).get("content").first { it.get("id").asText() == id }

  // ---- Especie ----

  @Test
  fun `a species row and detail carry the primary photo and the count`() {
    val ids = speciesPhotos(3)

    val row = row("/species?size=100", speciesId)
    assertEquals(3, row.get("photoCount").asInt())
    assertEquals(ids[0], row.get("primaryPhoto").get("id").asText())
    assertEquals("/media/${ids[0]}/thumb", row.get("primaryPhoto").get("urls").get("thumb").asText())
    assertTrue(row.get("primaryPhoto").get("altText").asText().isNotBlank())

    send("GET", "/species/$speciesId")
      .andExpect(jsonPath("$.photoCount").value(3))
      .andExpect(jsonPath("$.primaryPhoto.id").value(ids[0]))
      .andExpect(jsonPath("$.primaryPhoto.urls.medium").value("/media/${ids[0]}/medium"))
  }

  @Test
  fun `a species without photos has no primary photo and a zero count`() {
    val row = row("/species?size=100", otherSpeciesId)

    assertEquals(0, row.get("photoCount").asInt())
    assertFalse(row.has("primaryPhoto"))
    send("GET", "/species/$otherSpeciesId")
      .andExpect(jsonPath("$.photoCount").value(0))
      .andExpect(jsonPath("$.primaryPhoto").doesNotExist())
  }

  @Test
  fun `choosing another cover changes the primary photo of the row`() {
    val (_, b) = speciesPhotos(2)
    send("PUT", "/species/$speciesId/photos/$b", json("primary" to true)).andExpect(status().isOk)

    assertEquals(b, row("/species?size=100", speciesId).get("primaryPhoto").get("id").asText())
  }

  @Test
  fun `the species nested in a plant row does not pretend to know its photos`() {
    speciesPhotos(1)
    createPlant()

    val plantRow = body(send("GET", "/plants").andExpect(status().isOk)).get("content").first()
    assertFalse(plantRow.get("species").has("photoCount"))
    assertFalse(plantRow.get("species").has("primaryPhoto"))
  }

  @Test
  fun `the photos of a page of species cost the same queries as a page without photos`() {
    val withPhotos = (1..6).map { newSpecies("Photographica $it", "PHO-$it") }
    withPhotos.forEach { speciesPhotos(1, it) }
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true

    entityManager.flush()
    entityManager.clear()
    statistics.clear()
    speciesService.list(SpeciesCriteria(code = "PHO-"), PageRequest.of(0, 10))
    val with = statistics.prepareStatementCount

    jdbcTemplate.update("DELETE FROM species_media")
    entityManager.clear()
    statistics.clear()
    speciesService.list(SpeciesCriteria(code = "PHO-"), PageRequest.of(0, 10))
    val without = statistics.prepareStatementCount

    assertEquals(without, with, "una consulta agregada por página, no una por fila: $with frente a $without")
  }

  @Test
  fun `retiring a species without plants retires its photos and their files after the commit`() {
    val species = newSpecies("Photographica unica", "PHO-UNI")
    val ids = speciesPhotos(2, species)
    val folders = ids.map { "media/$it" }
    assertTrue(folders.all { storage.exists("$it/full") })

    send("DELETE", "/species/$species").andExpect(status().isNoContent)
    entityManager.flush()

    assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM species_media WHERE species_id = ?", Long::class.java, species.toLong()))
    assertEquals(0L, jdbcTemplate.queryForObject("SELECT count(*) FROM media_asset WHERE id IN (?, ?)", Long::class.java, ids[0].toLong(), ids[1].toLong()))
    assertTrue(folders.all { storage.exists("$it/full") }, "los archivos siguen hasta que se confirma")
    TestTransaction.flagForCommit()
    TestTransaction.end()
    assertTrue(folders.none { storage.exists("$it/full") }, "tras confirmarse, los archivos se retiran")
    TestTransaction.start()
  }

  @Test
  fun `retiring a species with plants stays 409 and keeps its photos`() {
    createPlant()
    val ids = speciesPhotos(2)

    send("DELETE", "/species/$speciesId").andExpect(status().isConflict)

    assertEquals(ids, listIds("/species/$speciesId/photos"))
    assertTrue(ids.all { storage.exists("media/$it/full") })
  }

  // ---- Ejemplar ----

  @Test
  fun `a plant row and detail carry the primary photo and the count`() {
    val plant = createPlant()
    val ids = plantPhotos(plant, 4)

    val row = row("/plants?size=100", plant)
    assertEquals(4, row.get("photoCount").asInt())
    assertEquals(ids[0], row.get("primaryPhoto").get("id").asText())
    send("GET", "/plants/$plant")
      .andExpect(jsonPath("$.photoCount").value(4))
      .andExpect(jsonPath("$.primaryPhoto.id").value(ids[0]))
      .andExpect(jsonPath("$.primaryPhoto.urls.thumb").value("/media/${ids[0]}/thumb"))
  }

  @Test
  fun `a plant without photos has no primary photo and a zero count`() {
    val plant = createPlant()

    val row = row("/plants?size=100", plant)
    assertEquals(0, row.get("photoCount").asInt())
    assertFalse(row.has("primaryPhoto"))
    send("GET", "/plants/$plant").andExpect(jsonPath("$.photoCount").value(0)).andExpect(jsonPath("$.primaryPhoto").doesNotExist())
  }

  @Test
  fun `the photos of the species do not count for the plant`() {
    val plant = createPlant()
    speciesPhotos(3)

    send("GET", "/plants/$plant").andExpect(jsonPath("$.photoCount").value(0)).andExpect(jsonPath("$.primaryPhoto").doesNotExist())
    assertEquals(0, row("/plants?size=100", plant).get("photoCount").asInt())
  }

  @Test
  fun `deleting the last photo clears the summary of the plant`() {
    val plant = createPlant()
    val a = plantPhotos(plant, 1).single()

    send("DELETE", "/plants/$plant/photos/$a").andExpect(status().isNoContent)
    entityManager.flush()

    send("GET", "/plants/$plant").andExpect(jsonPath("$.photoCount").value(0)).andExpect(jsonPath("$.primaryPhoto").doesNotExist())
  }

  @Test
  fun `the photos of a page of plants cost the same queries as a page without photos`() {
    val plants = (1..6).map { createPlant() }
    plants.forEach { plantPhotos(it, 1) }
    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true

    entityManager.flush()
    entityManager.clear()
    statistics.clear()
    plantService.search(PlantCriteria(), PageRequest.of(0, 10))
    val with = statistics.prepareStatementCount

    jdbcTemplate.update("DELETE FROM plant_media")
    entityManager.clear()
    statistics.clear()
    plantService.search(PlantCriteria(), PageRequest.of(0, 10))
    val without = statistics.prepareStatementCount

    assertEquals(without, with, "una consulta agregada por página, no una por fila: $with frente a $without")
  }
}

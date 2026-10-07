package com.cactify.api

import com.cactify.TestImages
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** Ayudas comunes de los tests de fotografías: subir, listar y leer los identificadores de la respuesta. */
abstract class AbstractMediaApiTest : AbstractTimelineApiTest() {

  protected val speciesId = "200001"
  protected val otherSpeciesId = "200002"

  protected fun smallJpeg(width: Int = 320, height: Int = 240) = TestImages.jpeg(width, height)

  private fun upload(path: String, files: List<ByteArray>, params: Map<String, String?>, contentTypes: List<String>? = null, names: List<String>? = null): ResultActions {
    val request = multipart(path)
    files.forEachIndexed { index, bytes ->
      request.file(
        MockMultipartFile("files", names?.get(index) ?: "foto-$index.jpg", contentTypes?.get(index) ?: "image/jpeg", bytes),
      )
    }
    params.forEach { (key, value) -> if (value != null) request.param(key, value) }
    return mockMvc.perform(request)
  }

  protected fun uploadToSpecies(
    species: String = speciesId,
    files: List<ByteArray> = listOf(smallJpeg()),
    vararg params: Pair<String, String?>,
  ): ResultActions = upload("/species/$species/photos", files, mapOf(*params))

  protected fun uploadToPlant(
    plant: String,
    files: List<ByteArray> = listOf(smallJpeg()),
    vararg params: Pair<String, String?>,
  ): ResultActions = upload("/plants/$plant/photos", files, mapOf(*params))

  protected fun uploadRaw(path: String, files: List<ByteArray>, contentTypes: List<String>, names: List<String>, vararg params: Pair<String, String?>): ResultActions =
    upload(path, files, mapOf(*params), contentTypes, names)

  /** Sube [count] fotos a la especie y devuelve sus identificadores en el orden recibido. */
  protected fun speciesPhotos(count: Int, species: String = speciesId): List<String> =
    idsOf(uploadToSpecies(species, List(count) { smallJpeg(320 + it, 240) }).andExpect(status().isCreated))

  protected fun plantPhotos(plant: String, count: Int, vararg params: Pair<String, String?>): List<String> =
    idsOf(uploadToPlant(plant, List(count) { smallJpeg(320 + it, 240) }, *params).andExpect(status().isCreated))

  protected fun idsOf(result: ResultActions): List<String> =
    objectMapper.readTree(result.andReturn().response.contentAsString).map { it.get("id").asText() }

  protected fun listIds(path: String): List<String> =
    objectMapper.readTree(send("GET", path).andExpect(status().isOk).andReturn().response.contentAsString)
      .get("content").map { it.get("id").asText() }

  protected fun primaries(path: String): List<String> =
    objectMapper.readTree(send("GET", path).andReturn().response.contentAsString)
      .get("content").filter { it.get("primary").asBoolean() }.map { it.get("id").asText() }

  protected fun body(result: ResultActions) = objectMapper.readTree(result.andReturn().response.contentAsString)

  /** Rellena la galería con [count] fotografías por SQL: sin pasar por el procesado de imágenes. */
  protected fun seedSpeciesGallery(species: String, count: Int) {
    val base = 700_000_000L
    repeat(count) { i ->
      val id = base + i
      jdbcTemplate.update(
        "INSERT INTO media_asset (id, storage_key, content_type, width, height, size_bytes, alt_text) VALUES (?, ?, 'image/jpeg', 10, 10, 10, 'x')",
        id, "media/$id",
      )
      jdbcTemplate.update(
        "INSERT INTO species_media (media_id, species_id, position, is_primary) VALUES (?, ?, ?, ?)",
        id, species.toLong(), i, i == 0,
      )
    }
  }

  protected fun seedPlantGallery(plant: String, count: Int) {
    val base = 710_000_000L
    repeat(count) { i ->
      val id = base + i
      jdbcTemplate.update(
        "INSERT INTO media_asset (id, storage_key, content_type, width, height, size_bytes, alt_text) VALUES (?, ?, 'image/jpeg', 10, 10, 10, 'x')",
        id, "media/$id",
      )
      jdbcTemplate.update(
        "INSERT INTO plant_media (media_id, plant_id, position, is_primary) VALUES (?, ?, ?, ?)",
        id, plant.toLong(), i, i == 0,
      )
    }
  }
}

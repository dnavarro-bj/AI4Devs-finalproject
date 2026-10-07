package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios del esquema de fotografías (ADR-002): las reglas viven también en la base de datos. */
class MediaSchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 985_000L

  /** Una fila rechazada aborta la transacción: cada test provoca un solo rechazo y es lo último que hace. */
  private fun assertRejected(message: String, insert: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { insert() }
  }

  private fun asset(
    alt: String = "Una foto",
    width: Int = 800,
    height: Int = 600,
    size: Long = 1000,
    contentType: String = "image/jpeg",
  ): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO media_asset (id, storage_key, content_type, width, height, size_bytes, alt_text) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id, "media/$id", contentType, width, height, size, alt,
    )
    return id
  }

  private fun plantId(): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, species_id, location_id) VALUES (?, ?, 'Planta', 200001, 300001)",
      id, "TEST-M-$id",
    )
    return id
  }

  private fun speciesMedia(asset: Long, species: Long = 200001, position: Int = 0, primary: Boolean = false): Long {
    jdbc.update(
      "INSERT INTO species_media (media_id, species_id, position, is_primary) VALUES (?, ?, ?, ?)",
      asset, species, position, primary,
    )
    return asset
  }

  private fun plantMedia(asset: Long, plant: Long, position: Int = 0, primary: Boolean = false, purpose: String? = null, event: Long? = null): Long {
    jdbc.update(
      "INSERT INTO plant_media (media_id, plant_id, event_id, purpose, position, is_primary) VALUES (?, ?, ?, ?, ?, ?)",
      asset, plant, event, purpose, position, primary,
    )
    return asset
  }

  private fun commentEvent(plant: Long): Long {
    val id = ++sequence
    jdbc.update("INSERT INTO plant_event (id, plant_id, event_type, occurred_at) VALUES (?, ?, 'comentario', now())", id, plant)
    jdbc.update("INSERT INTO plant_comment (id, text) VALUES (?, 'Nota')", id)
    return id
  }

  private fun count(sql: String): Long = jdbc.queryForObject(sql, Long::class.java)!!

  @Test
  fun `a valid asset with both satellites is accepted`() {
    val plant = plantId()
    speciesMedia(asset(), primary = true)
    plantMedia(asset(contentType = "image/png"), plant, primary = true, purpose = "detalle")

    assertEquals(2L, count("SELECT count(*) FROM media_asset"))
    assertEquals(1L, count("SELECT count(*) FROM species_media"))
    assertEquals(1L, count("SELECT count(*) FROM plant_media"))
  }

  @Test
  fun `a blank alt text is rejected`() {
    assertRejected("el texto alternativo es obligatorio") { asset(alt = "   ") }
  }

  @Test
  fun `dimensions and size must be positive`() {
    assertRejected("ancho cero") { asset(width = 0) }
  }

  @Test
  fun `a zero height is rejected`() {
    assertRejected("alto cero") { asset(height = 0) }
  }

  @Test
  fun `a zero size is rejected`() {
    assertRejected("tamaño cero") { asset(size = 0) }
  }

  @Test
  fun `an unknown content type is rejected`() {
    assertRejected("gif no se guarda") { asset(contentType = "image/gif") }
  }

  @Test
  fun `a satellite shares the key of its asset so an asset has one owner row per kind`() {
    val a = asset()
    speciesMedia(a)
    assertRejected("el mismo archivo no puede estar dos veces en la galería de especies") { speciesMedia(a, position = 1) }
  }

  @Test
  fun `deleting the asset deletes its satellite`() {
    val plant = plantId()
    val s = speciesMedia(asset())
    val p = plantMedia(asset(), plant)

    jdbc.update("DELETE FROM media_asset WHERE id IN (?, ?)", s, p)

    assertEquals(0L, count("SELECT count(*) FROM species_media"))
    assertEquals(0L, count("SELECT count(*) FROM plant_media"))
  }

  @Test
  fun `only one primary per species`() {
    speciesMedia(asset(), primary = true)
    speciesMedia(asset(), position = 1, primary = false)
    assertRejected("dos principales en la misma especie") { speciesMedia(asset(), position = 2, primary = true) }
  }

  @Test
  fun `two species may each have a primary`() {
    val other = jdbc.queryForObject("SELECT id FROM species WHERE id <> 200001 LIMIT 1", Long::class.java)!!
    speciesMedia(asset(), primary = true)
    speciesMedia(asset(), species = other, primary = true)

    assertEquals(2L, count("SELECT count(*) FROM species_media WHERE is_primary"))
  }

  @Test
  fun `only one primary per plant`() {
    val plant = plantId()
    plantMedia(asset(), plant, primary = true)
    plantMedia(asset(), plant, position = 1)
    assertRejected("dos principales en el mismo ejemplar") { plantMedia(asset(), plant, position = 2, primary = true) }
  }

  @Test
  fun `a negative position is rejected`() {
    assertRejected("posición negativa") { speciesMedia(asset(), position = -1) }
  }

  @Test
  fun `a negative position is rejected for plants too`() {
    val plant = plantId()
    assertRejected("posición negativa") { plantMedia(asset(), plant, position = -1) }
  }

  @Test
  fun `an unknown purpose is rejected`() {
    val plant = plantId()
    assertRejected("selfie no es un propósito") { plantMedia(asset(), plant, purpose = "selfie") }
  }

  @Test
  fun `each valid purpose is accepted`() {
    val plant = plantId()
    listOf("general", "detalle", "etiqueta_fisica").forEachIndexed { i, purpose -> plantMedia(asset(), plant, position = i, purpose = purpose) }

    assertEquals(3L, count("SELECT count(*) FROM plant_media WHERE purpose IS NOT NULL"))
  }

  @Test
  fun `the species and the plant must exist`() {
    assertRejected("especie inexistente") { speciesMedia(asset(), species = 1L) }
  }

  @Test
  fun `a plant that does not exist is rejected`() {
    assertRejected("planta inexistente") { plantMedia(asset(), 1L) }
  }

  @Test
  fun `a photo may hang from an event and the reference must exist`() {
    val plant = plantId()
    val event = commentEvent(plant)
    plantMedia(asset(), plant, event = event)

    assertEquals(1L, count("SELECT count(*) FROM plant_media WHERE event_id IS NOT NULL"))
    assertRejected("el evento 1 no existe") { plantMedia(asset(), plant, event = 1L) }
  }

  @Test
  fun `deleting the event keeps the photo without event`() {
    val plant = plantId()
    val event = commentEvent(plant)
    plantMedia(asset(), plant, event = event)

    jdbc.update("DELETE FROM plant_comment WHERE id = ?", event)
    jdbc.update("DELETE FROM plant_event WHERE id = ?", event)

    assertEquals(1L, count("SELECT count(*) FROM plant_media WHERE event_id IS NULL"))
    assertEquals(1L, count("SELECT count(*) FROM media_asset"))
  }

  @Test
  fun `previous data carries no photos and nothing is invented`() {
    assertEquals(0L, count("SELECT count(*) FROM media_asset"))
    assertEquals(0L, count("SELECT count(*) FROM species_media"))
    assertEquals(0L, count("SELECT count(*) FROM plant_media"))
  }
}

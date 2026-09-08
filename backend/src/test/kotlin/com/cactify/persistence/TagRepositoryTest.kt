package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.domain.Location
import com.cactify.domain.Plant
import com.cactify.domain.SoilMix
import com.cactify.domain.Species
import com.cactify.domain.Tag
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.repos.TagRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate

/**
 * El puerto de tags deja de ser solo alta y listado: la ficha necesita saber **cuántas plantas
 * tienen** una etiqueta, la retirada necesita esa cifra para responder `409` antes de borrar, y
 * la combinación necesita mover las asignaciones sin romper la clave compuesta de `plant_tag`.
 */
class TagRepositoryTest : AbstractIntegrationTest() {

  @Autowired lateinit var tagRepository: TagRepository
  @Autowired lateinit var plantRepository: PlantRepository
  @Autowired lateinit var locationRepository: LocationRepository
  @Autowired lateinit var speciesRepository: SpeciesRepository
  @Autowired lateinit var soilMixRepository: SoilMixRepository
  @Autowired lateinit var jdbcTemplate: JdbcTemplate

  @PersistenceContext lateinit var entityManager: EntityManager

  @Test
  fun `a tag tells how many plants have it`() {
    clearInventory()
    val used = tagRepository.save(Tag(name = "Globular"))
    val spare = tagRepository.save(Tag(name = "Sin uso"))
    plantWith("Uno", used)
    plantWith("Dos", used)
    entityManager.flush()

    assertEquals(2, tagRepository.countPlantsWith(used.id))
    assertEquals(0, tagRepository.countPlantsWith(spare.id), "el cero es un dato, no una ausencia")
  }

  /**
   * El caso que rompe la combinación ingenua: reasignar a ciegas una planta que ya tiene las dos
   * violaría la clave primaria compuesta `(plant_id, tag_id)`.
   */
  @Test
  fun `merging moves the assignments that do not collide and drops the ones that do`() {
    clearInventory()
    val source = tagRepository.save(Tag(name = "Semilleros 2021"))
    val target = tagRepository.save(Tag(name = "Semillero propio"))
    val onlySource = plantWith("Solo origen", source)
    val both = plantWith("Ambas", source, target)
    entityManager.flush()

    val dropped = tagRepository.removeDuplicateAssignments(source.id, target.id)
    val moved = tagRepository.reassignPlants(source.id, target.id)
    entityManager.flush()
    entityManager.clear()

    assertEquals(1, dropped, "la planta que ya tenía ambas es la única colisión")
    assertEquals(1, moved, "la que solo tenía el origen se reasigna")
    assertEquals(2, tagRepository.countPlantsWith(target.id))
    assertEquals(0, tagRepository.countPlantsWith(source.id))
    assertEquals(setOf(target.id), plantRepository.findOneById(both.id)!!.tags.map { it.id }.toSet())
    assertEquals(setOf(target.id), plantRepository.findOneById(onlySource.id)!!.tags.map { it.id }.toSet())
  }

  /** El catálogo compara usos, así que necesita el recuento de la página entera en una consulta. */
  @Test
  fun `the usage of a whole page of tags is resolved at once`() {
    clearInventory()
    val busy = tagRepository.save(Tag(name = "Muy usada"))
    val quiet = tagRepository.save(Tag(name = "Poco usada"))
    val unused = tagRepository.save(Tag(name = "Sin uso"))
    plantWith("Uno", busy)
    plantWith("Dos", busy, quiet)
    entityManager.flush()

    val usage = tagRepository.countPlantsByTag(listOf(busy.id, quiet.id, unused.id))
      .associate { it.tagId to it.plantCount }

    assertEquals(2, usage[busy.id])
    assertEquals(1, usage[quiet.id])
    assertEquals(0, usage[unused.id], "un tag sin uso cuenta cero, no falta del resultado")
  }

  @Test
  fun `a tag is withdrawn from the catalog`() {
    clearInventory()
    val saved = tagRepository.save(Tag(name = "Etiqueta efímera"))
    entityManager.flush()

    tagRepository.delete(saved)
    entityManager.flush()

    assertNull(tagRepository.findOneById(saved.id))
  }

  private fun plantWith(nickname: String, vararg tags: Tag): Plant {
    val plant = plantRepository.save(Plant(nickname = nickname, location = location(), species = species()))
    plant.updateTags(tags.toSet())
    return plantRepository.save(plant)
  }

  private var cachedLocation: Location? = null
  private var cachedSpecies: Species? = null

  private fun location(): Location = cachedLocation
    ?: locationRepository.save(Location(name = "Invernadero de prueba")).also { cachedLocation = it }

  private fun species(): Species = cachedSpecies ?: speciesRepository.save(
    Species(
      scientificName = "Echinopsis oxygona",
      commonName = "Especie de prueba",
      minHumidity = 10,
      maxHumidity = 30,
      minTemperature = 10,
      maxTemperature = 35,
      minLightHours = 6,
      maxLightHours = 10,
      wateringGuideline = "cada 10 dias",
      soilMix = soilMixRepository.save(
        SoilMix(
          name = "Mezcla de prueba",
          organicPercentage = 30,
          mineralPercentage = 70,
          phMin = BigDecimal("5.5"),
          phMax = BigDecimal("6.5"),
          description = "mezcla de prueba",
        ),
      ),
    ),
  ).also { cachedSpecies = it }

  private fun clearInventory() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant")
    jdbcTemplate.update("DELETE FROM tag")
  }
}

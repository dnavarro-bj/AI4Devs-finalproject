package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.domain.Location
import com.cactify.domain.Plant
import com.cactify.domain.SoilMixId
import com.cactify.domain.Species
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.jdbc.core.JdbcTemplate

/** Los puertos que el catálogo de especies necesita, al nivel del repositorio. */
class SpeciesRepositoryTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var speciesRepository: SpeciesRepository

  @Autowired
  lateinit var soilMixRepository: SoilMixRepository

  @Autowired
  lateinit var plantRepository: PlantRepository

  @Autowired
  lateinit var locationRepository: LocationRepository

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @PersistenceContext
  lateinit var entityManager: EntityManager

  /** La mezcla `100001` la siembra `V2__seed.sql`. */
  @Test
  fun `the seeded soil mix can be recovered by its id`() {
    val soilMix = soilMixRepository.findOneById(SoilMixId.from(100001L))

    assertNotNull(soilMix)
    assertEquals("Sustrato mineral de drenaje rápido", soilMix.name)
  }

  @Test
  fun `species are listed as a page ordered by scientific name`() {
    clearSpecies()
    listOf("Mammillaria elongata", "Astrophytum myriostigma", "Ferocactus glaucescens")
      .forEach { speciesRepository.save(species(it)) }
    entityManager.flush()

    val page = speciesRepository.findAll(PageRequest.of(0, 2, Sort.by("scientificName")))

    assertEquals(3, page.totalElements)
    assertEquals(2, page.totalPages)
    assertEquals(
      listOf("Astrophytum myriostigma", "Ferocactus glaucescens"),
      page.content.map { it.scientificName },
    )
  }

  @Test
  fun `a species tells whether it has any plant registered`() {
    clearSpecies()
    val planted = speciesRepository.save(species("Echinopsis oxygona"))
    val untouched = speciesRepository.save(species("Gymnocalycium mihanovichii"))
    val location = locationRepository.save(Location(name = "Bandeja de prueba"))
    plantRepository.save(Plant(nickname = "Pinchitos", location = location, species = planted))
    entityManager.flush()

    assertTrue(plantRepository.existsBySpeciesId(planted.id))
    assertFalse(plantRepository.existsBySpeciesId(untouched.id))
  }

  private fun species(scientificName: String) = Species(
    scientificName = scientificName,
    commonName = "Especie de prueba",
    minHumidity = 10,
    maxHumidity = 30,
    minTemperature = 10,
    maxTemperature = 35,
    minLightHours = 6,
    maxLightHours = 10,
    wateringGuideline = "cada 10 dias",
    soilMix = requireNotNull(soilMixRepository.findOneById(SoilMixId.from(100001L))),
  )

  private fun clearSpecies() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant")
    jdbcTemplate.update("DELETE FROM species")
  }
}

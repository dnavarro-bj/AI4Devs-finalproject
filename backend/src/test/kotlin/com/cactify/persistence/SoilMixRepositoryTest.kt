package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.Species
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.jdbc.core.JdbcTemplate

/**
 * El puerto de mezclas deja de ser de solo lectura: el catálogo (historia 0.8) necesita guardar,
 * listar paginado, retirar y saber cuántas especies recomiendan una mezcla.
 */
class SoilMixRepositoryTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var soilMixRepository: SoilMixRepository

  @Autowired
  lateinit var speciesRepository: SpeciesRepository

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `a soil mix is stored and recovered by its id`() {
    val saved = soilMixRepository.save(soilMix("Mezcla de prueba"))
    entityManager.flush()

    val found = soilMixRepository.findOneById(saved.id)

    assertNotNull(found)
    assertEquals("Mezcla de prueba", found.name)
    assertEquals(30, found.organicPercentage)
  }

  @Test
  fun `soil mixes are listed as a page ordered by name`() {
    clearCatalog()
    listOf("Turba y perlita", "Akadama", "Pómez y arena").forEach { soilMixRepository.save(soilMix(it)) }
    entityManager.flush()

    val page = soilMixRepository.findAll(PageRequest.of(0, 2, Sort.by("name")))

    assertEquals(3, page.totalElements)
    assertEquals(2, page.totalPages)
    assertEquals(listOf("Akadama", "Pómez y arena"), page.content.map { it.name })
  }

  @Test
  fun `a soil mix is withdrawn from the catalog`() {
    clearCatalog()
    val saved = soilMixRepository.save(soilMix("Mezcla efímera"))
    entityManager.flush()

    soilMixRepository.delete(saved)
    entityManager.flush()

    assertNull(soilMixRepository.findOneById(saved.id))
  }

  /**
   * Es lo que separa un `409` explicable de un fallo de integridad: se pregunta antes de borrar,
   * no se captura después.
   */
  @Test
  fun `a soil mix tells how many species recommend it`() {
    clearCatalog()
    val used = soilMixRepository.save(soilMix("Mezcla en uso"))
    val spare = soilMixRepository.save(soilMix("Mezcla sin uso"))
    speciesRepository.save(species("Echinopsis oxygona", used))
    speciesRepository.save(species("Gymnocalycium mihanovichii", used))
    entityManager.flush()

    assertEquals(2, soilMixRepository.countSpeciesUsing(used.id))
    assertEquals(0, soilMixRepository.countSpeciesUsing(spare.id))
  }

  @Test
  fun `an unknown id resolves to nothing, not to an error`() {
    assertNull(soilMixRepository.findOneById(SoilMixId.from(999_999L)))
  }

  private fun soilMix(name: String) = SoilMix(
    name = name,
    organicPercentage = 30,
    mineralPercentage = 70,
    phMin = BigDecimal("5.5"),
    phMax = BigDecimal("6.5"),
    description = "mezcla de prueba",
  )

  private fun species(scientificName: String, soilMix: SoilMix) = Species(
    scientificName = scientificName,
    commonName = "Especie de prueba",
    minHumidity = 10,
    maxHumidity = 30,
    minTemperature = 10,
    maxTemperature = 35,
    minLightHours = 6,
    maxLightHours = 10,
    wateringGuideline = "cada 10 dias",
    soilMix = soilMix,
  )

  private fun clearCatalog() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant")
    jdbcTemplate.update("DELETE FROM species")
    jdbcTemplate.update("DELETE FROM soil_mix")
  }
}

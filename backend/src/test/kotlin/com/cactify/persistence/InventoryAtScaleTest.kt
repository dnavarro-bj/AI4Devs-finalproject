package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.PlantCriteria
import com.cactify.application.PlantService
import com.cactify.application.SpeciesCriteria
import com.cactify.application.SpeciesService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * La medición de la decisión 7 del design de `filtros-y-orden-del-inventario`: con 2.000
 * ejemplares y 500 especies, ¿hace falta algún índice? Sirve además de **humo de escala**: los
 * filtros nuevos devuelven lo correcto sobre una colección del tamaño del objetivo y no tardan
 * más de lo razonable (la cota es deliberadamente holgada; los tiempos reales se anotan en el
 * design).
 */
class InventoryAtScaleTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var plantService: PlantService

  @Autowired
  lateinit var speciesService: SpeciesService

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @BeforeEach
  fun seedAtScale() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant_movement")
    jdbcTemplate.update("DELETE FROM plant_event")
    jdbcTemplate.update("DELETE FROM plant")
    jdbcTemplate.update("DELETE FROM species")
    jdbcTemplate.update(
      """
      INSERT INTO species (id, code, scientific_name, common_name, min_humidity, max_humidity,
                           min_temperature, max_temperature, min_light_hours, max_light_hours,
                           watering_guideline, soil_mix_id, sun_exposure, environment)
      SELECT 5000000 + g, 'CAT-S' || lpad(g::text, 3, '0'), 'Genus' || g || ' species' || g,
             'Nombre comun ' || g, 10, 40, (g % 15), 35, 5, 9, 'cada 10 dias', 100001,
             (ARRAY['sombra','semisombra','soleado','pleno_sol'])[1 + g % 4],
             (ARRAY['interior','exterior','ambos'])[1 + g % 3]
        FROM generate_series(1, 500) g
      """,
    )
    jdbcTemplate.update(
      """
      INSERT INTO species_period (id, species_id, period_type, start_month, end_month)
      SELECT 5100000 + g, 5000000 + g, 'crecimiento', 1 + (g % 12), 1 + ((g + 4) % 12)
        FROM generate_series(1, 500) g
      """,
    )
    jdbcTemplate.update(
      """
      INSERT INTO plant (id, nickname, location_id, species_id, code)
      SELECT 6000000 + g, 'Planta numero ' || g, 300001 + (g % 3), 5000000 + 1 + (g % 500),
             'CAT-P' || lpad(g::text, 4, '0')
        FROM generate_series(1, 2000) g
      """,
    )
  }

  /** La mediana de cinco ejecuciones tras una de calentamiento, en milisegundos. */
  private fun measure(label: String, block: () -> Unit): Long {
    block()
    val times = (1..5).map {
      val start = System.nanoTime()
      block()
      (System.nanoTime() - start) / 1_000_000
    }.sorted()
    println("MEDICION $label: mediana ${times[2]} ms (min ${times.first()}, max ${times.last()})")
    return times[2]
  }

  private val firstPage = PageRequest.of(0, 25, Sort.by("createdAt"))

  @Test
  fun `the text search over 2000 plants is correct and fast`() {
    val result = plantService.search(PlantCriteria(text = "numero 1999"), firstPage)

    assertEquals(1, result.totalElements)
    assertTrue(measure("q sobre 2000 ejemplares") { plantService.search(PlantCriteria(text = "numero 19"), firstPage) } < 1000)
  }

  @Test
  fun `sorting 2000 plants by species is fast`() {
    val sorted = PageRequest.of(0, 25, Sort.by("species"))

    assertEquals(2000, plantService.search(PlantCriteria(), sorted).totalElements)
    assertTrue(measure("sort=species sobre 2000 ejemplares") { plantService.search(PlantCriteria(), sorted) } < 1000)
  }

  @Test
  fun `filtering by species traits and species over 2000 plants is fast`() {
    assertTrue(
      measure("exposure+environment sobre 2000 ejemplares") {
        plantService.search(PlantCriteria(exposures = listOf("pleno_sol"), environments = listOf("exterior")), firstPage)
      } < 1000,
    )
    assertTrue(
      measure("species sobre 2000 ejemplares") {
        plantService.search(PlantCriteria(species = listOf("5000010", "5000020")), firstPage)
      } < 1000,
    )
  }

  @Test
  fun `the species catalog filters over 500 species are correct and fast`() {
    val page = PageRequest.of(0, 25, Sort.by("scientificName"))

    assertEquals(1, speciesService.list(SpeciesCriteria(text = "species123"), page).totalElements)
    assertTrue(measure("q sobre 500 especies") { speciesService.list(SpeciesCriteria(text = "nombre comun 1"), page) } < 1000)
    assertTrue(
      measure("growthMonth x3 sobre 500 especies") { speciesService.list(SpeciesCriteria(growthMonths = listOf(12, 1, 2)), page) } < 1000,
    )
    assertTrue(
      measure("rasgos + temperatura sobre 500 especies") {
        speciesService.list(SpeciesCriteria(exposures = listOf("semisombra"), minTemperatureFrom = 5, minTemperatureTo = 9), page)
      } < 1000,
    )
  }
}

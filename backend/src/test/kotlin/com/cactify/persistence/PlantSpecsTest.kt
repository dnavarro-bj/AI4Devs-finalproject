package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.application.PlantService
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.Tag
import com.cactify.domain.TagId
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.specs.PlantSpecs
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.hibernate.SessionFactory
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Cada `Specification` por separado, al nivel del repositorio. Aquí se comprueba lo que un test
 * de API no distingue: que el AND de tags es una subconsulta de recuento y no un OR, y que el
 * `fetch` de la decisión 4 no rompe la consulta de `count` ni deja un N+1 en el mapeo del DTO.
 */
class PlantSpecsTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var plantRepository: PlantRepository

  @Autowired
  lateinit var plantService: PlantService

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @PersistenceContext
  lateinit var entityManager: EntityManager

  private lateinit var greenhouse: Location
  private lateinit var tray: Location
  private lateinit var globular: Tag
  private lateinit var small: Tag

  private val byCreatedAt = Sort.by("createdAt")

  @BeforeEach
  fun setUpInventory() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant")

    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    greenhouse = entityManager.find(Location::class.java, LocationId.from("300001"))
    tray = entityManager.find(Location::class.java, LocationId.from("300002"))
    globular = entityManager.find(Tag::class.java, TagId.from("400001"))
    small = entityManager.find(Tag::class.java, TagId.from("400002"))

    fun plant(nickname: String, location: Location, vararg tags: Tag) {
      val plant = Plant(nickname = nickname, location = location, species = species)
      entityManager.persist(plant)
      plant.updateTags(tags.toSet())
    }

    plant("Ambos tags", greenhouse, globular, small)
    plant("Solo globular", greenhouse, globular)
    plant("Sin tags", greenhouse)
    plant("Globular en bandeja", tray, globular)
    entityManager.flush()
  }

  @Test
  fun `byLocation on its own returns only the plants in that location`() {
    val page = plantRepository.findAll(PlantSpecs.byLocation(tray.id), PageRequest.of(0, 10, byCreatedAt))

    assertEquals(listOf("Globular en bandeja"), page.content.map { it.nickname })
    assertEquals(1, page.totalElements)
  }

  @Test
  fun `byLocation with a null id filters nothing`() {
    val page = plantRepository.findAll(PlantSpecs.byLocation(null), PageRequest.of(0, 10, byCreatedAt))

    assertEquals(4, page.totalElements)
  }

  @Test
  fun `byAllTags with one tag returns every plant carrying it`() {
    val page = plantRepository.findAll(PlantSpecs.byAllTags(setOf(globular.id)), PageRequest.of(0, 10, byCreatedAt))

    assertEquals(
      setOf("Ambos tags", "Solo globular", "Globular en bandeja"),
      page.content.map { it.nickname }.toSet(),
    )
  }

  @Test
  fun `byAllTags with two tags is an AND, not an OR`() {
    val page = plantRepository.findAll(
      PlantSpecs.byAllTags(setOf(globular.id, small.id)),
      PageRequest.of(0, 10, byCreatedAt),
    )

    assertEquals(listOf("Ambos tags"), page.content.map { it.nickname })
  }

  @Test
  fun `byAllTags with an empty set filters nothing`() {
    val page = plantRepository.findAll(PlantSpecs.byAllTags(emptySet()), PageRequest.of(0, 10, byCreatedAt))

    assertEquals(4, page.totalElements)
  }

  @Test
  fun `withSpeciesAndLocation survives the count query that paginating triggers`() {
    val page = plantRepository.findAll(
      PlantSpecs.withSpeciesAndLocation(),
      PageRequest.of(0, 2, byCreatedAt),
    )

    assertEquals(2, page.content.size)
    assertEquals(4, page.totalElements, "el count debe contar el inventario completo")
    assertEquals(2, page.totalPages)
  }

  @Test
  fun `mapping the listing DTO does not fire one query per plant`() {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    repeat(8) { entityManager.persist(Plant(nickname = "Bola extra $it", location = greenhouse, species = species)) }

    val statistics = entityManager.entityManagerFactory.unwrap(SessionFactory::class.java).statistics
    statistics.isStatisticsEnabled = true
    entityManager.flush()
    entityManager.clear()
    statistics.clear()

    val page = plantService.search(locationId = null, tagIds = emptyList(), pageable = PageRequest.of(0, 12, byCreatedAt))

    assertEquals(12, page.content.size)
    // Con un N+1 serían 12 consultas de especie más 12 de localización. El `fetch` las trae en la
    // del contenido, así que el número no crece con el tamaño de la página.
    assertTrue(
      statistics.prepareStatementCount < page.content.size,
      "el número de consultas crece con la página: fueron ${statistics.prepareStatementCount} " +
        "para ${page.content.size} plantas",
    )
  }
}

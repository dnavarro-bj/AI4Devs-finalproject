package com.cactify.persistence

import com.cactify.AbstractIntegrationTest
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.SoilMix
import com.cactify.domain.Species
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate

/**
 * El puerto de localizaciones deja de ser solo alta y listado: la ficha necesita saber **cuántos
 * ejemplares alberga** una localización, y la retirada necesita esa misma cifra para responder
 * `409` antes de borrar en vez de dejar saltar la clave foránea.
 */
class LocationRepositoryTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var locationRepository: LocationRepository

  @Autowired
  lateinit var plantRepository: PlantRepository

  @Autowired
  lateinit var speciesRepository: SpeciesRepository

  @Autowired
  lateinit var soilMixRepository: SoilMixRepository

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Test
  fun `a location tells how many plants it holds`() {
    clearInventory()
    val used = locationRepository.save(Location(name = "Invernadero en uso"))
    val species = someSpecies()
    plantRepository.save(Plant(nickname = "Uno", location = used, species = species))
    plantRepository.save(Plant(nickname = "Dos", location = used, species = species))
    entityManager.flush()

    assertEquals(2, locationRepository.countPlantsIn(used.id))
  }

  /** El caso de cero es el que decide si la localización se puede retirar: no puede faltar. */
  @Test
  fun `an empty location counts zero, it does not fail`() {
    clearInventory()
    val empty = locationRepository.save(Location(name = "Estanteria vacia"))
    entityManager.flush()

    assertEquals(0, locationRepository.countPlantsIn(empty.id))
  }

  /**
   * El mapa del vivero pinta la carga de cada localización, así que el listado necesita los
   * recuentos de toda la página. En **una** consulta: una por fila sería el `N+1` que se descartó.
   */
  @Test
  fun `the usage of a whole page of locations is resolved at once`() {
    clearInventory()
    val busy = locationRepository.save(Location(name = "Invernadero lleno"))
    val quiet = locationRepository.save(Location(name = "Bandeja tranquila"))
    val empty = locationRepository.save(Location(name = "Estanteria vacia"))
    val species = someSpecies()
    plantRepository.save(Plant(nickname = "Uno", location = busy, species = species))
    plantRepository.save(Plant(nickname = "Dos", location = busy, species = species))
    plantRepository.save(Plant(nickname = "Tres", location = quiet, species = species))
    entityManager.flush()

    val usage = locationRepository.countPlantsByLocation(listOf(busy.id, quiet.id, empty.id))
      .associate { it.locationId to it.plantCount }

    assertEquals(2, usage[busy.id])
    assertEquals(1, usage[quiet.id])
    assertEquals(0, usage[empty.id], "una localización vacía cuenta cero, no falta del resultado")
  }

  @Test
  fun `asking the usage of no locations asks nothing`() {
    assertEquals(emptyList(), locationRepository.countPlantsByLocation(emptyList()))
  }

  @Test
  fun `a location is withdrawn from the catalog`() {
    clearInventory()
    val saved = locationRepository.save(Location(name = "Localizacion efimera"))
    entityManager.flush()

    locationRepository.delete(saved)
    entityManager.flush()

    assertNull(locationRepository.findOneById(saved.id))
  }

  @Test
  fun `an unknown id resolves to nothing, not to an error`() {
    assertNull(locationRepository.findOneById(LocationId.from(999_999L)))
  }

  private fun someSpecies(): Species {
    val soilMix = soilMixRepository.save(
      SoilMix(
        name = "Mezcla de prueba",
        organicPercentage = 30,
        mineralPercentage = 70,
        phMin = BigDecimal("5.5"),
        phMax = BigDecimal("6.5"),
        description = "mezcla de prueba",
      ),
    )
    return speciesRepository.save(
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
        soilMix = soilMix,
      ),
    )
  }

  private fun clearInventory() {
    jdbcTemplate.update("DELETE FROM ai_recommendation")
    jdbcTemplate.update("DELETE FROM care_record")
    jdbcTemplate.update("DELETE FROM plant_tag")
    jdbcTemplate.update("DELETE FROM plant")
    jdbcTemplate.update("DELETE FROM location")
  }
}

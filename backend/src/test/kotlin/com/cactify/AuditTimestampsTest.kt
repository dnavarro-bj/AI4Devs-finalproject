package com.cactify

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.Tag
import com.cactify.domain.TagId
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Escenarios de "Marcas de tiempo de auditoría" que gestiona la aplicación. Con el reloj
 * congelado se afirman instantes exactos, no solo que el campo venga informado.
 */
@Import(MutableClockConfiguration::class)
class AuditTimestampsTest : AbstractIntegrationTest() {

  @PersistenceContext
  lateinit var entityManager: EntityManager

  @Autowired
  lateinit var jdbcTemplate: JdbcTemplate

  @Autowired
  lateinit var clock: MutableClock

  @Test
  fun `a row created by the application carries both timestamps, equal to each other`() {
    val now = clock.instant()

    val location = Location(name = "Auditada al crear")
    entityManager.persist(location)
    entityManager.flush()

    assertEquals(now, location.createdAt, "createdAt debe ser el instante del reloj")
    assertEquals(now, location.updatedAt, "en una fila recién creada ambas marcas son iguales")
  }

  @Test
  fun `modifying a row advances only its update timestamp`() {
    val location = Location(name = "Auditada al modificar")
    entityManager.persist(location)
    entityManager.flush()
    val createdAt = location.createdAt

    clock.advanceBy(Duration.ofMinutes(30))
    location.rename("Auditada al modificar, renombrada")
    entityManager.flush()

    assertEquals(createdAt, location.createdAt, "createdAt no debe cambiar al modificar")
    assertEquals(createdAt.plus(Duration.ofMinutes(30)), location.updatedAt)
    assertTrue(location.updatedAt.isAfter(location.createdAt))
  }

  @Test
  fun `a timestamp survives a reload unchanged, at the precision the column stores`() {
    // El reloj del sistema da nanosegundos; TIMESTAMPTZ guarda microsegundos. Si la marca no se
    // recorta al sellarla, la respuesta del alta y una consulta posterior devuelven cadenas
    // distintas para el mismo instante.
    clock.advanceBy(Duration.ofNanos(479_235_925))
    val location = Location(name = "Auditada con nanos")
    entityManager.persist(location)
    val inMemory = location.createdAt
    entityManager.flush()
    entityManager.clear()

    val reloaded = entityManager.find(Location::class.java, location.id)

    assertEquals(inMemory, reloaded.createdAt, "la marca sellada debe sobrevivir a la ida y vuelta")
  }

  @Test
  fun `join table rows carry their timestamps even though no entity manages them`() {
    val species = entityManager.find(Species::class.java, SpeciesId.from("200001"))
    val location = entityManager.find(Location::class.java, LocationId.from("300001"))
    val plant = Plant(nickname = "Bola con tags auditados", location = location, species = species)
    entityManager.persist(plant)
    val tag = entityManager.find(Tag::class.java, TagId.from("400001"))

    plant.updateTags(setOf(tag))
    entityManager.flush()

    val filled = jdbcTemplate.queryForObject(
      "SELECT bool_and(created_at IS NOT NULL AND updated_at IS NOT NULL) FROM plant_tag WHERE plant_id = ?",
      Boolean::class.java,
      plant.id.id,
    )

    assertTrue(filled!!, "las filas de plant_tag deben llevar sus marcas puestas por el DEFAULT")
  }
}

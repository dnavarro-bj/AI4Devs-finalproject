package com.cactify

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Escenarios de «Jerarquía y ficha de la localización» y «Historial de movimientos» en el esquema (ADR-002). */
class LocationHierarchySchemaTest : AbstractIntegrationTest() {

  @Autowired
  lateinit var jdbc: JdbcTemplate

  private var sequence = 960_000L

  /**
   * Una fila rechazada aborta la transacción de PostgreSQL, así que **cada test provoca un solo
   * rechazo y es lo último que hace**. No se usa una transacción aparte por intento: lo que el test ya
   * ha insertado no estaría confirmado y no lo vería, y un `UNIQUE` contra una fila sin confirmar
   * esperaría a la transacción del propio test (un interbloqueo).
   */
  private fun assertRejected(message: String, insert: () -> Unit) {
    assertFailsWith<DataIntegrityViolationException>(message) { insert() }
  }

  private fun insertLocation(
    code: String? = "LOC-${sequence + 1}",
    parentId: Long? = null,
    type: String? = null,
    environment: String? = null,
    exposure: String? = null,
    capacity: Int? = null,
    id: Long = ++sequence,
  ): Long {
    jdbc.update(
      """
      INSERT INTO location (id, name, code, parent_id, location_type, environment, sun_exposure, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      id, "Localizacion $id", code, parentId, type, environment, exposure, capacity,
    )
    return id
  }

  private fun insertMovement(plantId: Long, from: Long, to: Long) = jdbc.update(
    "INSERT INTO plant_movement (id, plant_id, from_location_id, to_location_id, moved_at) VALUES (?, ?, ?, ?, now())",
    ++sequence, plantId, from, to,
  )

  @Test
  fun `the seeded locations are roots with a distinct code`() {
    val rows = jdbc.queryForList("SELECT code, parent_id FROM location WHERE id IN (300001, 300002, 300003)")

    assertEquals(3, rows.size)
    assertEquals(3, rows.map { it["code"] }.toSet().size, "los códigos deben ser distintos")
    assertEquals(true, rows.all { it["parent_id"] == null }, "las existentes pasan a ser raíces")
  }

  @Test
  fun `a location can hang from another`() {
    val parent = insertLocation()
    val child = insertLocation(parentId = parent)

    assertEquals(parent, jdbc.queryForObject("SELECT parent_id FROM location WHERE id = ?", Long::class.java, child))
  }

  @Test
  fun `a location cannot be its own parent`() {
    val id = ++sequence
    assertRejected("ser su propio padre debía rechazarse") { insertLocation(id = id, parentId = id) }
  }

  @Test
  fun `a parent that does not exist is rejected`() {
    assertRejected("un padre inexistente debía rechazarse") { insertLocation(parentId = 1L) }
  }

  @Test
  fun `a duplicate code is rejected`() {
    insertLocation(code = "LOC-DUP")

    assertRejected("el mismo código debía rechazarse") { insertLocation(code = "LOC-DUP") }
  }

  @Test
  fun `a code that only differs in case is rejected`() {
    insertLocation(code = "LOC-DUP")

    assertRejected("el código en minúsculas debía rechazarse") { insertLocation(code = "loc-dup") }
  }

  @Test
  fun `a code that only differs in surrounding spaces is rejected`() {
    insertLocation(code = "LOC-DUP")

    assertRejected("el código con espacios debía rechazarse") { insertLocation(code = " LOC-DUP ") }
  }

  @Test
  fun `a missing code is rejected`() {
    assertRejected("un código nulo debía rechazarse") { insertLocation(code = null) }
  }

  @Test
  fun `a blank code is rejected`() {
    assertRejected("un código en blanco debía rechazarse") { insertLocation(code = "   ") }
  }

  @Test
  fun `every value of the closed vocabularies is accepted`() {
    for (type in listOf("bancada", "bandeja", "invernadero", "zona_exterior", "estanteria", "otro")) insertLocation(type = type)
    for (env in listOf("interior", "cubierto", "exterior")) insertLocation(environment = env)
    for (sun in listOf("sombra", "semisombra", "soleado", "pleno_sol")) insertLocation(exposure = sun)
  }

  @Test
  fun `a type out of the vocabulary is rejected`() {
    assertRejected("tipo «almacen» debía rechazarse") { insertLocation(type = "almacen") }
  }

  @Test
  fun `an environment out of the vocabulary is rejected, including the species one`() {
    assertRejected("entorno «ambos» debía rechazarse: es de la especie") { insertLocation(environment = "ambos") }
  }

  @Test
  fun `an exposure out of the vocabulary is rejected`() {
    assertRejected("exposición «radiante» debía rechazarse") { insertLocation(exposure = "radiante") }
  }

  @Test
  fun `a positive capacity is accepted`() {
    insertLocation(capacity = 250)
  }

  @Test
  fun `a capacity of zero is rejected`() {
    assertRejected("capacidad 0 debía rechazarse") { insertLocation(capacity = 0) }
  }

  @Test
  fun `a negative capacity is rejected`() {
    assertRejected("capacidad negativa debía rechazarse") { insertLocation(capacity = -5) }
  }

  @Test
  fun `a movement between two places is accepted`() {
    val plant = insertPlant()

    insertMovement(plant, 300001, 300002)

    assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM plant_movement WHERE plant_id = ?", Int::class.java, plant))
  }

  @Test
  fun `a movement cannot keep the same place`() {
    val plant = insertPlant()

    assertRejected("origen igual al destino debía rechazarse") { insertMovement(plant, 300001, 300001) }
  }

  @Test
  fun `a location that appears in a movement cannot be deleted straight from the table`() {
    val plant = insertPlant()
    val destination = insertLocation()
    insertMovement(plant, 300001, destination)

    assertRejected("la FK debía impedir borrar un destino con historial") {
      jdbc.update("DELETE FROM location WHERE id = ?", destination)
    }
  }

  @Test
  fun `existing plants have no movements`() {
    assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM plant_movement", Int::class.java))
  }

  private fun insertPlant(): Long {
    val id = ++sequence
    jdbc.update(
      "INSERT INTO plant (id, code, nickname, location_id, species_id) VALUES (?, ?, 'Bola', 300001, 200001)",
      id, "TEST-M-$id",
    )
    return id
  }
}

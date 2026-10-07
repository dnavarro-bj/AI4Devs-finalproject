package com.cactify.application

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Los criterios se construyen igual desde los parámetros del listado que desde la consulta de una vista. */
class ListCriteriaTest {

  private fun params(query: String) = CanonicalQuery.parameters(CanonicalQuery.of(query))

  @Test
  fun `a plants query builds the same criteria as the listing parameters`() {
    val fromQuery = PlantCriteria.fromQuery(params("status=cuarentena&species=200001&exposure=pleno_sol&q=suegra&location=300001&includeDescendants=true&tag=1&tag=2&code=gruss&environment=interior"))
    val direct = PlantCriteria(
      location = "300001", tags = listOf("1", "2"), code = "gruss", statuses = listOf("cuarentena"), includeDescendants = true,
      text = "suegra", species = listOf("200001"), exposures = listOf("pleno_sol"), environments = listOf("interior"),
    )

    assertEquals(direct.locationId, fromQuery.locationId)
    assertEquals(direct.tagIds, fromQuery.tagIds)
    assertEquals(direct.code, fromQuery.code)
    assertEquals(direct.statuses, fromQuery.statuses)
    assertEquals(direct.includeDescendants, fromQuery.includeDescendants)
    assertEquals(direct.text, fromQuery.text)
    assertEquals(direct.speciesIds, fromQuery.speciesIds)
    assertEquals(direct.exposures, fromQuery.exposures)
    assertEquals(direct.environments, fromQuery.environments)
  }

  @Test
  fun `a species query builds the same criteria as the listing parameters`() {
    val fromQuery = SpeciesCriteria.fromQuery(params("minTemperatureFrom=9&growthMonth=12&growthMonth=1&exposure=semisombra&q=cact&soilMix=100001&bloomMonth=5&minTemperatureTo=15&environment=exterior&code=cat"))

    assertEquals(9, fromQuery.minTemperatureFrom)
    assertEquals(15, fromQuery.minTemperatureTo)
    assertEquals(setOf(12, 1), fromQuery.growthMonths)
    assertEquals(setOf(5), fromQuery.bloomMonths)
    assertEquals("cact", fromQuery.text)
    assertEquals("cat", fromQuery.code)
    assertEquals(1, fromQuery.exposures.size)
    assertEquals(1, fromQuery.environments.size)
    assertEquals(1, fromQuery.soilMixIds.size)
  }

  @Test
  fun `an empty query is valid`() {
    assertTrue(PlantCriteria.fromQuery(params("")).statuses.isEmpty())
    assertTrue(SpeciesCriteria.fromQuery(params("")).growthMonths.isEmpty())
  }

  @Test
  fun `an unknown parameter is rejected`() {
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("colour=red")) }
    assertFailsWith<IllegalArgumentException> { SpeciesCriteria.fromQuery(params("colour=red")) }
  }

  @Test
  fun `a parameter of the other scope is rejected`() {
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("growthMonth=1")) }
    assertFailsWith<IllegalArgumentException> { SpeciesCriteria.fromQuery(params("status=activa")) }
  }

  @Test
  fun `invalid values are rejected like the listing does`() {
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("status=resucitada")) }
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("environment=playa")) }
    assertFailsWith<NumberFormatException> { PlantCriteria.fromQuery(params("species=abc")) }
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("includeDescendants=maybe")) }
    assertFailsWith<IllegalArgumentException> { SpeciesCriteria.fromQuery(params("growthMonth=13")) }
    assertFailsWith<NumberFormatException> { SpeciesCriteria.fromQuery(params("minTemperatureFrom=frio")) }
  }

  @Test
  fun `a single-valued parameter does not take several values`() {
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("location=1&location=2")) }
  }

  @Test
  fun `the order must use public keys`() {
    PlantCriteria.fromQuery(params("sort=species,asc&sort=code,desc"))
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("sort=lastReview,desc")) }
    assertFailsWith<IllegalArgumentException> { PlantCriteria.fromQuery(params("sort=code,sideways")) }
    assertFailsWith<IllegalArgumentException> { SpeciesCriteria.fromQuery(params("sort=periodRows,asc")) }
  }
}

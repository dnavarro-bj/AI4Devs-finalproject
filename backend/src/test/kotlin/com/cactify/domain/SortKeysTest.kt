package com.cactify.domain

import com.cactify.domain.specs.PlantSortKeys
import com.cactify.domain.specs.SpeciesSortKeys
import org.junit.jupiter.api.Test
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** ADR-016: el orden se pide con claves públicas y se traduce a la ruta de la entidad. */
class SortKeysTest {

  private fun translate(sort: Sort) = PlantSortKeys.translate(PageRequest.of(0, 25, sort)).sort.toList()

  @Test
  fun `a public key is translated to the path of its property`() {
    val orders = translate(Sort.by(Sort.Order.asc("species")))

    assertEquals("species.scientificName", orders.first().property)
    assertEquals(Sort.Direction.ASC, orders.first().direction)
  }

  @Test
  fun `species and location sort by name and not by identifier`() {
    assertEquals("species.scientificName", translate(Sort.by("species")).first().property)
    assertEquals("location.name", translate(Sort.by("location")).first().property)
  }

  @Test
  fun `the direction is kept`() {
    assertEquals(Sort.Direction.DESC, translate(Sort.by(Sort.Order.desc("code"))).first().direction)
  }

  @Test
  fun `the identifier is appended as the final tiebreak`() {
    val orders = translate(Sort.by("species", "nickname"))

    assertEquals(listOf("species.scientificName", "nickname", "id"), orders.map { it.property })
  }

  @Test
  fun `the identifier is not a public key and the system adds it`() {
    // `id` no es una clave pública: el desempate lo pone el sistema.
    assertFailsWith<IllegalArgumentException> { translate(Sort.by("id")) }
  }

  @Test
  fun `a key that is not public is rejected`() {
    assertFailsWith<IllegalArgumentException> { translate(Sort.by("tagSet")) }
    assertFailsWith<IllegalArgumentException> { translate(Sort.by("password")) }
    assertFailsWith<IllegalArgumentException> { translate(Sort.by("lastReview")) }
  }

  @Test
  fun `the rejection lists the admitted keys`() {
    val error = assertFailsWith<IllegalArgumentException> { translate(Sort.by("sideways")) }

    assertEquals(true, error.message!!.contains("code") && error.message!!.contains("createdAt"))
  }

  @Test
  fun `an unsorted request is left as it is plus the tiebreak`() {
    val translated = PlantSortKeys.translate(PageRequest.of(2, 10))

    assertEquals(2, translated.pageNumber)
    assertEquals(10, translated.pageSize)
    assertEquals(listOf("id"), translated.sort.toList().map { it.property })
  }

  @Test
  fun `the page is kept`() {
    val translated = PlantSortKeys.translate(PageRequest.of(3, 7, Sort.by("code")))

    assertEquals(3, translated.pageNumber)
    assertEquals(7, translated.pageSize)
  }

  @Test
  fun `species keys translate exposure to the exposure property`() {
    val orders = SpeciesSortKeys.translate(PageRequest.of(0, 25, Sort.by("exposure", "scientificName"))).sort.toList()

    assertEquals(listOf("sunExposure", "scientificName", "id"), orders.map { it.property })
    assertFailsWith<IllegalArgumentException> { SpeciesSortKeys.translate(PageRequest.of(0, 25, Sort.by("periodRows"))) }
  }
}

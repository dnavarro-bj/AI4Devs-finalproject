package com.cactify.domain

import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** Los enumerados de lotes (ADR-007) y la invariante de la operación (ADR-011). */
class BatchTest {

  private val clock = Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneOffset.UTC)
  private val skew = Duration.ofMinutes(5)

  @Test
  fun `batch actions parse their persisted values`() {
    assertEquals(listOf("lectura", "intervencion", "comentario"), BatchAction.entries.map { it.value })
    assertEquals(BatchAction.Comment, BatchAction(" COMENTARIO "))
    assertEquals("lectura", BatchAction.Reading.toString())
    assertFailsWith<IllegalArgumentException> { BatchAction("mover") }
  }

  @Test
  fun `scope kinds parse their persisted values`() {
    assertEquals(listOf("plantas", "localizacion", "consulta"), BatchScopeKind.entries.map { it.value })
    assertEquals(BatchScopeKind.Query, BatchScopeKind(" Consulta"))
    assertFailsWith<IllegalArgumentException> { BatchScopeKind("todo") }
  }

  @Test
  fun `a batch records what was done to how many plants and when`() {
    val batch = Batch.record(BatchAction.Reading, BatchScopeKind.Location, 31, Instant.parse("2026-10-15T09:00:00Z"), clock, skew)

    assertEquals(BatchAction.Reading, batch.action)
    assertEquals(BatchScopeKind.Location, batch.scopeKind)
    assertEquals(31, batch.plantCount)
    assertEquals(Instant.parse("2026-10-15T09:00:00Z"), batch.occurredAt)
  }

  @Test
  fun `without an instant the batch takes the clock's`() {
    val batch = Batch.record(BatchAction.Comment, BatchScopeKind.Plants, 1, null, clock, skew)

    assertEquals(clock.instant(), batch.occurredAt)
  }

  @Test
  fun `a batch must affect at least one plant`() {
    assertFailsWith<IllegalArgumentException> { Batch.record(BatchAction.Reading, BatchScopeKind.Plants, 0, null, clock, skew) }
  }

  @Test
  fun `a batch cannot be in the future`() {
    assertFailsWith<IllegalArgumentException> {
      Batch.record(BatchAction.Reading, BatchScopeKind.Plants, 2, clock.instant().plus(Duration.ofHours(1)), clock, skew)
    }
  }
}

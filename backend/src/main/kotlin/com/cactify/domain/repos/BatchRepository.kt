package com.cactify.domain.repos

import com.cactify.domain.Batch
import com.cactify.domain.BatchId

/** Puerto de acceso a las operaciones por lote (ADR-006). No hay listado: ninguna pantalla lo pide. */
interface BatchRepository {
  fun save(batch: Batch): Batch
  fun findOneById(id: BatchId): Batch?
}

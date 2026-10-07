package com.cactify.domain.repos

import com.cactify.domain.PlantEvent
import com.cactify.domain.PlantEventId

/** Puerto de los eventos que se crean desde la ficha: comentarios, intervenciones y floraciones. */
interface PlantEventRepository {
  fun save(event: PlantEvent): PlantEvent
  fun findOneById(id: PlantEventId): PlantEvent?
  fun delete(entity: PlantEvent)

  /** Los eventos de una página de la cronología, en una sola consulta. */
  fun findAllByIdIn(ids: Collection<PlantEventId>): List<PlantEvent>
}

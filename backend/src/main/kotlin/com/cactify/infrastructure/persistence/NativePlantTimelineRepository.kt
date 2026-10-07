package com.cactify.infrastructure.persistence

import com.cactify.domain.PlantId
import com.cactify.domain.TimelineType
import com.cactify.domain.repos.PlantTimelineRepository
import com.cactify.domain.repos.TimelineRef
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Repository

/**
 * La unión de las cuatro fuentes de la cronología, sin copiar nada: cada tabla sigue siendo la
 * fuente de su verdad y una lectura aparece en cuanto existe. El filtro por tipo va **dentro** de
 * la unión, antes de paginar, así que el total y las páginas son los del filtro. Es el único sitio
 * con SQL nativo para esto.
 */
@Repository
class NativePlantTimelineRepository : PlantTimelineRepository {

  @PersistenceContext
  private lateinit var em: EntityManager

  override fun findPage(plantId: PlantId, types: Set<TimelineType>, pageable: Pageable): Page<TimelineRef> {
    val wanted = (types.ifEmpty { TimelineType.entries.toSet() }).map { it.value }

    val total = (
      em.createNativeQuery("SELECT count(*) FROM ($UNION) t WHERE t.type IN (:types)")
        .setParameter("plantId", plantId.id)
        .setParameter("types", wanted)
        .singleResult as Number
      ).toLong()

    @Suppress("UNCHECKED_CAST")
    val rows = em.createNativeQuery(
      "SELECT t.type, t.id FROM ($UNION) t WHERE t.type IN (:types) ORDER BY t.occurred_at DESC, t.id DESC",
    )
      .setParameter("plantId", plantId.id)
      .setParameter("types", wanted)
      .setFirstResult(pageable.offset.toInt())
      .setMaxResults(pageable.pageSize)
      .resultList as List<Array<Any>>

    return PageImpl(rows.map { TimelineRef(TimelineType(it[0] as String), (it[1] as Number).toLong()) }, pageable, total)
  }

  private companion object {
    const val UNION = """
      SELECT 'lectura' AS type, id, recorded_at AS occurred_at FROM care_record WHERE plant_id = :plantId
      UNION ALL
      SELECT 'cambio_estado', id, occurred_at FROM plant_status_change WHERE plant_id = :plantId
      UNION ALL
      SELECT 'movimiento', id, moved_at FROM plant_movement WHERE plant_id = :plantId
      UNION ALL
      SELECT event_type, id, occurred_at FROM plant_event WHERE plant_id = :plantId
    """
  }
}

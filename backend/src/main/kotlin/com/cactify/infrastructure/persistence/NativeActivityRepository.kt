package com.cactify.infrastructure.persistence

import com.cactify.domain.repos.ActivityBatch
import com.cactify.domain.repos.ActivityComment
import com.cactify.domain.repos.ActivityIntervention
import com.cactify.domain.repos.ActivityPlant
import com.cactify.domain.repos.ActivityRef
import com.cactify.domain.repos.ActivityRepository
import com.cactify.domain.repos.ActivityTask
import com.cactify.domain.repos.ActivityType
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Repository
import java.time.Instant

/**
 * La unión de las cuatro fuentes de la actividad, en SQL nativo: filas de `batch`, tareas completadas
 * y los comentarios e intervenciones que **no** pertenecen a un lote ni a una tarea. Devuelve
 * proyecciones y no entidades: el Dashboard necesita unas pocas columnas de cada fila y cargar
 * entidades con sus asociaciones multiplicaría las consultas.
 */
@Repository
class NativeActivityRepository : ActivityRepository {

  @PersistenceContext
  private lateinit var em: EntityManager

  override fun findPage(pageable: Pageable): Page<ActivityRef> {
    val total = (em.createNativeQuery("SELECT count(*) FROM ($UNION) t").singleResult as Number).toLong()

    @Suppress("UNCHECKED_CAST")
    val rows = em.createNativeQuery("SELECT t.type, t.id, t.occurred_at FROM ($UNION) t ORDER BY t.occurred_at DESC, t.id DESC")
      .setFirstResult(pageable.offset.toInt())
      .setMaxResults(pageable.pageSize)
      .resultList as List<Array<Any>>

    return PageImpl(
      rows.map { ActivityRef(ActivityType(it[0] as String), (it[1] as Number).toLong(), toInstant(it[2])) },
      pageable,
      total,
    )
  }

  override fun batches(ids: Collection<Long>): List<ActivityBatch> = rows(
    "SELECT b.id, b.action, b.plant_count FROM batch b WHERE b.id IN (:ids)",
    ids,
  ).map { ActivityBatch(num(it[0]), it[1] as String, num(it[2]).toInt()) }

  override fun tasks(ids: Collection<Long>): List<ActivityTask> = rows(
    "SELECT t.id, t.task_type, t.title, t.affected_plants FROM task t WHERE t.id IN (:ids)",
    ids,
  ).map { ActivityTask(num(it[0]), it[1] as String, it[2] as String, num(it[3]).toInt()) }

  override fun comments(eventIds: Collection<Long>): List<ActivityComment> = rows(
    """
    SELECT e.id, p.id, p.code, p.nickname, c.text
      FROM plant_event e JOIN plant_comment c ON c.id = e.id JOIN plant p ON p.id = e.plant_id
     WHERE e.id IN (:ids)
    """.trimIndent(),
    eventIds,
  ).map { ActivityComment(num(it[0]), ActivityPlant(num(it[1]), it[2] as String, it[3] as String), it[4] as String) }

  override fun interventions(eventIds: Collection<Long>): List<ActivityIntervention> = rows(
    """
    SELECT e.id, p.id, p.code, p.nickname, i.intervention_type
      FROM plant_event e JOIN plant_intervention i ON i.id = e.id JOIN plant p ON p.id = e.plant_id
     WHERE e.id IN (:ids)
    """.trimIndent(),
    eventIds,
  ).map { ActivityIntervention(num(it[0]), ActivityPlant(num(it[1]), it[2] as String, it[3] as String), it[4] as String) }

  @Suppress("UNCHECKED_CAST")
  private fun rows(sql: String, ids: Collection<Long>): List<Array<Any>> =
    if (ids.isEmpty()) emptyList() else em.createNativeQuery(sql).setParameter("ids", ids).resultList as List<Array<Any>>

  private fun num(value: Any): Long = (value as Number).toLong()

  private fun toInstant(value: Any): Instant = when (value) {
    is Instant -> value
    is java.sql.Timestamp -> value.toInstant()
    is java.time.OffsetDateTime -> value.toInstant()
    else -> error("Instante de actividad inesperado: ${value::class.simpleName}")
  }

  private companion object {
    const val UNION = """
      SELECT 'lote' AS type, b.id AS id, b.occurred_at AS occurred_at FROM batch b
      UNION ALL
      SELECT 'tarea', t.id, t.completed_at FROM task t WHERE t.status = 'completada'
      UNION ALL
      SELECT 'comentario', e.id, e.occurred_at FROM plant_event e WHERE e.event_type = 'comentario' AND e.batch_id IS NULL
      UNION ALL
      SELECT 'intervencion', e.id, e.occurred_at
        FROM plant_event e JOIN plant_intervention i ON i.id = e.id
       WHERE e.event_type = 'intervencion' AND e.batch_id IS NULL AND i.task_id IS NULL
    """
  }
}

package com.cactify.infrastructure.persistence

import com.cactify.domain.AlertSeverity
import com.cactify.domain.LocationId
import com.cactify.domain.PlantId
import com.cactify.domain.TaskId
import com.cactify.domain.TaskType
import com.cactify.domain.repos.AlertQueries
import com.cactify.domain.repos.AlertSummary
import com.cactify.domain.repos.OverdueTask
import com.cactify.domain.repos.UnobservedPlant
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Repository
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime

/**
 * Las consultas agregadas de las alertas, nativas. Van por `EntityManager` y no como métodos de
 * `JpaAlertRepository` porque devuelven filas calculadas y no entidades, y un `EntityManager` vacía
 * la sesión antes de una consulta nativa, así que ven lo que la transacción ya ha cambiado.
 */
@Repository
class NativeAlertQueries : AlertQueries {

  @PersistenceContext
  private lateinit var em: EntityManager

  override fun lockCondition(key: String) {
    em.createNativeQuery("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(:key))) AS locked")
      .setParameter("key", key)
      .resultList
  }

  override fun openSummaryByLocation(ids: Collection<LocationId>, withDescendants: Boolean): Map<LocationId, AlertSummary> {
    if (ids.isEmpty()) return emptyMap()
    val scope = if (withDescendants) {
      """
      WITH RECURSIVE scope(root_id, id, depth) AS (
        SELECT l.id, l.id, 0 FROM location l WHERE l.id IN (:ids)
        UNION ALL
        SELECT s.root_id, c.id, s.depth + 1 FROM scope s JOIN location c ON c.parent_id = s.id WHERE s.depth < $MAX_DEPTH
      )
      """
    } else {
      "WITH scope(root_id, id) AS (SELECT l.id, l.id FROM location l WHERE l.id IN (:ids))"
    }
    val rows = em.createNativeQuery(
      """
      $scope
      SELECT root_id, count(*), max(rank) FROM (
        SELECT s.root_id AS root_id, a.id AS id, a.severity_rank AS rank
          FROM scope s JOIN alert a ON a.location_id = s.id AND a.closed_at IS NULL
        UNION ALL
        SELECT s.root_id, a.id, a.severity_rank
          FROM scope s JOIN plant p ON p.location_id = s.id JOIN alert a ON a.plant_id = p.id AND a.closed_at IS NULL
      ) found GROUP BY root_id
      """.trimIndent(),
    ).setParameter("ids", ids.map { it.id }).resultList
    return rows.associate { row ->
      val (root, count, rank) = row as Array<*>
      LocationId.from((root as Number).toLong()) to AlertSummary((count as Number).toLong(), severityOfRank((rank as Number).toInt()))
    }
  }

  override fun highestOpenSeverityByPlant(ids: Collection<PlantId>): Map<PlantId, AlertSeverity> {
    if (ids.isEmpty()) return emptyMap()
    val rows = em.createNativeQuery(
      "SELECT plant_id, max(severity_rank) FROM alert WHERE plant_id IN (:ids) AND closed_at IS NULL GROUP BY plant_id",
    ).setParameter("ids", ids.map { it.id }).resultList
    return rows.associate { row ->
      val (plant, rank) = row as Array<*>
      PlantId.from((plant as Number).toLong()) to severityOfRank((rank as Number).toInt())!!
    }
  }

  override fun unobservedPlants(cutoff: Instant): List<UnobservedPlant> {
    val rows = em.createNativeQuery(
      """
      SELECT p.id, COALESCE(obs.last_obs, p.created_at) AS last_obs
        FROM plant p
        LEFT JOIN LATERAL (
          SELECT max(t) AS last_obs FROM (
            SELECT max(recorded_at) AS t FROM care_record WHERE plant_id = p.id
            UNION ALL
            SELECT max(occurred_at) FROM plant_event
             WHERE plant_id = p.id AND event_type IN ('comentario', 'intervencion', 'floracion')
          ) x
        ) obs ON true
       WHERE p.status IN ('activa', 'cuarentena', 'enferma')
         AND COALESCE(obs.last_obs, p.created_at) <= :cutoff
      """.trimIndent(),
    ).setParameter("cutoff", cutoff).resultList
    return rows.map { row ->
      val (plant, last) = row as Array<*>
      UnobservedPlant(PlantId.from((plant as Number).toLong()), toInstant(last!!))
    }
  }

  override fun overdueTasks(dueOnOrBefore: LocalDate): List<OverdueTask> {
    val rows = em.createNativeQuery(
      """
      SELECT t.id, t.task_type, t.title, t.due_to, t.location_id,
             (SELECT min(tp.plant_id) FROM task_plant tp WHERE tp.task_id = t.id) AS plant_id
        FROM task t
       WHERE t.status = 'pendiente'
         AND t.due_to <= :due
         AND (
           t.location_id IS NOT NULL
           OR (
             (SELECT count(*) FROM task_plant tp WHERE tp.task_id = t.id) = 1
             AND EXISTS (SELECT 1 FROM task_plant tp JOIN plant p ON p.id = tp.plant_id
                          WHERE tp.task_id = t.id AND p.status IN ('activa', 'cuarentena', 'enferma'))
           )
         )
      """.trimIndent(),
    ).setParameter("due", dueOnOrBefore).resultList
    return rows.map { row ->
      val r = row as Array<*>
      OverdueTask(
        taskId = TaskId.from((r[0] as Number).toLong()),
        type = TaskType(r[1] as String),
        title = r[2] as String,
        dueTo = toLocalDate(r[3]!!),
        locationId = (r[4] as Number?)?.let { LocationId.from(it.toLong()) },
        plantId = (r[5] as Number?)?.let { PlantId.from(it.toLong()) },
      )
    }
  }

  private fun severityOfRank(rank: Int): AlertSeverity? = AlertSeverity.entries.find { it.rank == rank }

  private fun toInstant(value: Any): Instant = when (value) {
    is Instant -> value
    is Timestamp -> value.toInstant()
    is OffsetDateTime -> value.toInstant()
    else -> error("Tipo de instante no esperado: ${value::class}")
  }

  private fun toLocalDate(value: Any): LocalDate = when (value) {
    is LocalDate -> value
    is java.sql.Date -> value.toLocalDate()
    else -> error("Tipo de fecha no esperado: ${value::class}")
  }

  private companion object {
    const val MAX_DEPTH = 32
  }
}

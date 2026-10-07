package com.cactify.infrastructure.persistence

import com.cactify.domain.LocationId
import com.cactify.domain.repos.LocationHierarchy
import com.cactify.domain.repos.LocationRef
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Repository

/**
 * Las consultas recursivas de la jerarquía, nativas sobre `parent_id`. Van por `EntityManager` y no
 * como métodos de `JpaLocationRepository` porque devuelven filas calculadas y no entidades; y un
 * `EntityManager` vacía la sesión antes de una consulta nativa, así que ven lo que la transacción
 * ya ha cambiado.
 *
 * `MAX_DEPTH` es una defensa, no una regla de negocio: un ciclo no debería existir (lo impiden el
 * servicio y el bloqueo de [lockHierarchy]), pero si existiera la recursión terminaría igualmente.
 */
@Repository
class JpaLocationHierarchy : LocationHierarchy {

  @PersistenceContext
  private lateinit var entityManager: EntityManager

  override fun pathsOf(ids: Collection<LocationId>): Map<LocationId, String> {
    if (ids.isEmpty()) return emptyMap()
    val rows = entityManager.createNativeQuery(
      """
      WITH RECURSIVE up(start_id, id, parent_id, name, depth) AS (
        SELECT l.id, l.id, l.parent_id, l.name, 0 FROM location l WHERE l.id IN (:ids)
        UNION ALL
        SELECT up.start_id, p.id, p.parent_id, p.name, up.depth + 1
          FROM up JOIN location p ON p.id = up.parent_id
         WHERE up.depth < $MAX_DEPTH
      )
      SELECT start_id, string_agg(name, ' / ' ORDER BY depth DESC) FROM up GROUP BY start_id
      """.trimIndent(),
    ).setParameter("ids", ids.map { it.id }).resultList
    return rows.associate { row ->
      val (id, path) = row as Array<*>
      LocationId.from((id as Number).toLong()) to path as String
    }
  }

  override fun ancestorsOf(id: LocationId): List<LocationRef> {
    val rows = entityManager.createNativeQuery(
      """
      WITH RECURSIVE up(id, parent_id, name, depth) AS (
        SELECT l.id, l.parent_id, l.name, 0 FROM location l WHERE l.id = :id
        UNION ALL
        SELECT p.id, p.parent_id, p.name, up.depth + 1
          FROM up JOIN location p ON p.id = up.parent_id
         WHERE up.depth < $MAX_DEPTH
      )
      SELECT id, name FROM up WHERE depth > 0 ORDER BY depth DESC
      """.trimIndent(),
    ).setParameter("id", id.id).resultList
    return rows.map { row ->
      val (ancestorId, name) = row as Array<*>
      LocationRef(LocationId.from((ancestorId as Number).toLong()), name as String)
    }
  }

  override fun totalPlantCounts(ids: Collection<LocationId>): Map<LocationId, Long> {
    if (ids.isEmpty()) return emptyMap()
    val rows = entityManager.createNativeQuery(
      """
      WITH RECURSIVE down(root_id, id, depth) AS (
        SELECT l.id, l.id, 0 FROM location l WHERE l.id IN (:ids)
        UNION ALL
        SELECT d.root_id, c.id, d.depth + 1
          FROM down d JOIN location c ON c.parent_id = d.id
         WHERE d.depth < $MAX_DEPTH
      )
      SELECT d.root_id, count(p.id) FROM down d LEFT JOIN plant p ON p.location_id = d.id GROUP BY d.root_id
      """.trimIndent(),
    ).setParameter("ids", ids.map { it.id }).resultList
    return rows.associate { row ->
      val (id, total) = row as Array<*>
      LocationId.from((id as Number).toLong()) to (total as Number).toLong()
    }
  }

  override fun subtreeIds(id: LocationId): Set<LocationId> {
    val rows = entityManager.createNativeQuery(
      """
      WITH RECURSIVE down(id, depth) AS (
        SELECT l.id, 0 FROM location l WHERE l.id = :id
        UNION ALL
        SELECT c.id, d.depth + 1 FROM down d JOIN location c ON c.parent_id = d.id WHERE d.depth < $MAX_DEPTH
      )
      SELECT id FROM down
      """.trimIndent(),
    ).setParameter("id", id.id).resultList
    return rows.map { LocationId.from((it as Number).toLong()) }.toSet()
  }

  override fun lockHierarchy() {
    entityManager.createNativeQuery("SELECT 1 FROM (SELECT pg_advisory_xact_lock($LOCK_KEY)) AS locked").resultList
  }

  private companion object {
    const val MAX_DEPTH = 50
    const val LOCK_KEY = 7_218_001L
  }
}

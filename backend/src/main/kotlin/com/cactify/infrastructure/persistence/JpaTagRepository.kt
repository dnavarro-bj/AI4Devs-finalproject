package com.cactify.infrastructure.persistence

import com.cactify.domain.Tag
import com.cactify.domain.TagId
import com.cactify.domain.repos.TagRepository
import com.cactify.domain.repos.TagUsage
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Implementa el puerto extendiendo a la vez `JpaRepository`. `application` inyecta siempre
 * [TagRepository], nunca este tipo.
 *
 * La combinación se resuelve en **dos sentencias sobre la tabla de unión**, no recorriendo las
 * plantas: `plant_tag` es una tabla de unión pura y no una entidad, así que JPQL no la alcanza y
 * las consultas son nativas. Es el único sitio donde eso es legítimo —el detalle de persistencia
 * vive aquí— y evita que combinar una etiqueta con cientos de plantas sean cientos de `UPDATE`.
 *
 * `flushAutomatically` y `clearAutomatically` no son opcionales: una modificación nativa no pasa
 * por la sesión, así que sin ellas el contexto de persistencia se quedaría con las asignaciones
 * viejas en memoria.
 *
 * Las nativas reciben el `Long` y no el identificador tipado: fuera de JPQL, Hibernate no sabe
 * destripar un `@Embeddable`. La conversión se hace aquí, en el borde, y el puerto sigue hablando
 * en `TagId` (ADR-008).
 */
@Repository
interface JpaTagRepository :
  TagRepository,
  JpaRepository<Tag, TagId> {

  /** La normalización del nombre no sale del nombre del método, así que va como `@Query`. */
  @Query("SELECT t FROM Tag t WHERE lower(trim(t.name)) = :name")
  override fun findByNormalizedName(name: String): Tag?

  /** Cuenta contra `Plant`, que es quien tiene la relación: `Tag` no conoce a sus plantas. */
  @Query("SELECT COUNT(p) FROM Plant p JOIN p.tagSet t WHERE t.id = :id")
  override fun countPlantsWith(@Param("id") id: TagId): Long

  override fun removeDuplicateAssignments(source: TagId, target: TagId): Int =
    deleteCollidingAssignments(source.id, target.id)

  override fun reassignPlants(source: TagId, target: TagId): Int =
    moveAssignments(source.id, target.id)

  /**
   * `LEFT JOIN` desde `Tag` y no desde `Plant`: contando sobre las plantas, los tags que nadie usa
   * no producirían fila y se perderían justo los que se pueden retirar.
   */
  @Query(
    """
    SELECT new com.cactify.domain.repos.TagUsage(t.id, COUNT(p))
    FROM Tag t LEFT JOIN Plant p ON t MEMBER OF p.tagSet
    WHERE t.id IN :ids
    GROUP BY t.id
    """,
  )
  override fun countPlantsByTag(@Param("ids") ids: Collection<TagId>): List<TagUsage>

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(
    value = """
      DELETE FROM plant_tag
      WHERE tag_id = :source
        AND plant_id IN (SELECT plant_id FROM plant_tag WHERE tag_id = :target)
    """,
    nativeQuery = true,
  )
  fun deleteCollidingAssignments(@Param("source") source: Long, @Param("target") target: Long): Int

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(
    value = "UPDATE plant_tag SET tag_id = :target WHERE tag_id = :source",
    nativeQuery = true,
  )
  fun moveAssignments(@Param("source") source: Long, @Param("target") target: Long): Int
}

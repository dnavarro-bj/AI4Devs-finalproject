package com.cactify.domain.repos

import com.cactify.domain.Tag
import com.cactify.domain.TagId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Cuántas plantas tienen un tag. Es un hecho del dominio y no una fila del listado, así que viaja
 * con su identificador tipado y no como `Object[]`.
 */
data class TagUsage(val tagId: TagId, val plantCount: Long)

/**
 * Puerto de acceso al catálogo de tags. No expone `findAll()` sin paginar: en este API no existe
 * el listado sin límite (ADR-009).
 *
 * Las tres últimas operaciones existen por la combinación de duplicados: `plant_tag` tiene clave
 * primaria compuesta `(plant_id, tag_id)`, así que reasignar a ciegas una planta que ya tiene
 * ambas etiquetas la violaría. Se descartan primero las colisiones y se reasigna después.
 */
interface TagRepository {
  fun save(tag: Tag): Tag
  fun delete(tag: Tag)
  fun findOneById(id: TagId): Tag?
  fun findAll(pageable: Pageable): Page<Tag>
  fun findByNormalizedName(name: String): Tag?
  fun findAllByIdIn(ids: Collection<TagId>): List<Tag>

  /** Cuántas plantas tienen la etiqueta. Sostiene la ficha y el `409` al retirarla en uso. */
  fun countPlantsWith(id: TagId): Long

  /**
   * El uso de varios tags **en una sola consulta**. El catálogo compara unas etiquetas con otras
   * para decidir cuáles sobran, así que necesita el recuento de toda la página; pedirlo fila a
   * fila sería un `N+1`. Los tags que nadie usa vienen con cero, no ausentes.
   */
  fun countPlantsByTag(ids: Collection<TagId>): List<TagUsage>

  /**
   * Retira las asignaciones del origen en las plantas que **ya tienen el destino**: son las que
   * colisionarían al reasignar. Devuelve cuántas eran.
   */
  fun removeDuplicateAssignments(source: TagId, target: TagId): Int

  /** Reasigna al destino las asignaciones que quedan del origen. Devuelve cuántas se movieron. */
  fun reassignPlants(source: TagId, target: TagId): Int
}

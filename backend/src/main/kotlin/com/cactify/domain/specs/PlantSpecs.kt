package com.cactify.domain.specs

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.Species
import com.cactify.domain.Tag
import com.cactify.domain.TagId
import org.springframework.data.jpa.domain.Specification

/**
 * Filtros del inventario como piezas nombradas y componibles. Cada factoría devuelve `null`
 * cuando su filtro no aplica, de modo que componerlas con `.and()` ignore sin ceremonia las que
 * no se han pedido.
 */
object PlantSpecs {

  fun byLocation(locationId: LocationId?): Specification<Plant> =
    Specification { root, _, cb ->
      locationId?.let { cb.equal(root.get<Location>("location").get<LocationId>("id"), it) }
    }

  /**
   * Trae especie y localización en la misma consulta (problema N+1). El `fetch` se omite en la
   * consulta de recuento que Spring Data lanza al paginar: un join fetch cuyo propietario no está
   * en el `SELECT` la hace fallar. `tagSet` no entra aquí: una colección en el fetch obligaría a
   * Hibernate a paginar en memoria.
   */
  fun withSpeciesAndLocation(): Specification<Plant> =
    Specification { root, query, _ ->
      if (query!!.resultType != Long::class.java && query.resultType != java.lang.Long::class.java) {
        root.fetch<Plant, Species>("species")
        root.fetch<Plant, Location>("location")
      }
      null
    }

  /**
   * Semántica AND: la planta debe tener *todos* los tags indicados. Un `IN` sobre el join daría
   * OR; aquí se cuenta cuántos de los tags pedidos tiene la planta y se exige que sean todos.
   */
  fun byAllTags(tagIds: Set<TagId>): Specification<Plant> =
    Specification { root, query, cb ->
      if (tagIds.isEmpty()) {
        null
      } else {
        val sub = query!!.subquery(Long::class.java)
        val other = sub.from(Plant::class.java)
        val tag = other.join<Plant, Tag>("tagSet")
        sub.select(cb.count(tag)).where(
          cb.equal(other, root),
          tag.get<TagId>("id").`in`(tagIds),
        )
        cb.equal(sub, tagIds.size.toLong())
      }
    }
}

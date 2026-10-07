package com.cactify.domain.specs

import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort

/**
 * Las claves de orden **públicas** de un listado (ADR-016) y la propiedad de la entidad a la que
 * cada una se traduce. Lo que el cliente puede pedir en `sort` es esta lista y no el modelo de
 * persistencia: renombrar una propiedad no rompe el API, y una propiedad que no está aquí —una
 * colección, un campo interno— no se puede ordenar.
 *
 * [translate] devuelve el `Pageable` con el orden traducido y el identificador como desempate
 * final, de modo que el orden es siempre total y estable entre páginas.
 */
class SortKeys(private val paths: Map<String, String>) {

  fun translate(pageable: Pageable): Pageable {
    val orders = pageable.sort.map { order ->
      val path = paths[order.property]
        ?: throw IllegalArgumentException(
          "No se puede ordenar por '${order.property}': las claves admitidas son ${paths.keys.joinToString()}",
        )
      order.withProperty(path)
    }.toList()
    return PageRequest.of(pageable.pageNumber, pageable.pageSize, Sort.by(orders + Sort.Order.asc(TIEBREAK)))
  }

  private companion object {
    const val TIEBREAK = "id"
  }
}

/** El inventario: `species` y `location` ordenan por **nombre**, no por el identificador de la FK. */
val PlantSortKeys = SortKeys(
  linkedMapOf(
    "code" to "code",
    "nickname" to "nickname",
    "species" to "species.scientificName",
    "location" to "location.name",
    "createdAt" to "createdAt",
  ),
)

val SpeciesSortKeys = SortKeys(
  linkedMapOf(
    "code" to "code",
    "scientificName" to "scientificName",
    "commonName" to "commonName",
    "exposure" to "sunExposure",
  ),
)

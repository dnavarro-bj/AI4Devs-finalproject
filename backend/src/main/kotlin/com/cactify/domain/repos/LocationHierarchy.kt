package com.cactify.domain.repos

import com.cactify.domain.LocationId

/** Un ancestro en una ruta: su identificador y su nombre. */
data class LocationRef(val id: LocationId, val name: String)

/**
 * Lo que la jerarquía de localizaciones sabe y que no se guarda en ninguna fila: la ruta, los
 * ancestros, el recuento con descendientes y el subárbol. Se calcula con consultas recursivas sobre
 * `parent_id`, **con un número de sentencias que no depende del de localizaciones consultadas**.
 *
 * Es un puerto aparte de [LocationRepository] porque su implementación no es una consulta derivada:
 * son consultas recursivas nativas. Todas llevan un tope de profundidad como defensa: un ciclo no
 * debería existir, pero si existiera no debe colgar la base.
 */
interface LocationHierarchy {

  /** La ruta completa de cada una, **incluida ella misma**: `Invernadero 1 / Bancada norte`. */
  fun pathsOf(ids: Collection<LocationId>): Map<LocationId, String>

  /** Los ancestros de una localización, de la raíz hacia abajo y **sin** ella misma. */
  fun ancestorsOf(id: LocationId): List<LocationRef>

  /** Cuántos ejemplares tiene cada una **contando los de todos sus descendientes**; las vacías, con cero. */
  fun totalPlantCounts(ids: Collection<LocationId>): Map<LocationId, Long>

  /** Los identificadores del subárbol de una localización, **incluida ella misma**; vacío si no existe. */
  fun subtreeIds(id: LocationId): Set<LocationId>

  /**
   * Serializa las ediciones de la jerarquía hasta el final de la transacción. Sin esto, dos
   * ediciones simultáneas que por separado son válidas podrían formar un ciclo entre las dos.
   */
  fun lockHierarchy()
}

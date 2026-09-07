package com.cactify.domain.repos

import com.cactify.domain.Location
import com.cactify.domain.LocationId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Puerto de acceso a localizaciones. No expone `findAll()` sin paginar: en este API no existe el
 * listado sin límite (ADR-009).
 *
 * `countPlantsIn` está aquí y no en `PlantRepository` porque la pregunta es sobre la localización
 * —«¿qué alberga?, ¿se puede retirar?»— y es lo que permite responder `409` antes de borrar en
 * lugar de dejar saltar la clave foránea. Es además la cifra que muestra la ficha, así que la
 * consulta hace falta igualmente.
 */
/**
 * Cuántos ejemplares alberga una localización. Es un hecho del dominio y no una fila del listado,
 * así que viaja con su identificador tipado y no como `Object[]`.
 */
data class LocationUsage(val locationId: LocationId, val plantCount: Long)

interface LocationRepository {
  fun save(location: Location): Location
  fun delete(location: Location)
  fun findOneById(id: LocationId): Location?
  fun findAll(pageable: Pageable): Page<Location>
  fun countPlantsIn(id: LocationId): Long

  /**
   * El uso de varias localizaciones **en una sola consulta**. Es lo que sostiene el mapa del
   * vivero: una localización sin su carga es un nombre suelto, y preguntarlo fila a fila sería el
   * `N+1` que se descartó. Las localizaciones vacías vienen con cero, no ausentes.
   */
  fun countPlantsByLocation(ids: Collection<LocationId>): List<LocationUsage>
}

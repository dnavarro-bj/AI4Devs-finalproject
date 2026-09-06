package com.cactify.domain.repos

import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Puerto de acceso al catálogo de mezclas de tierra (historia 0.8). Nació mínimo —solo resolver
 * el `soilMixId` con el que se da de alta una especie— porque el catálogo no tenía endpoints;
 * ahora los tiene, así que declara también la escritura y el listado.
 *
 * No expone `findAll()` sin paginar: en este API no existe el listado sin límite (ADR-009).
 *
 * `countSpeciesUsing` está aquí y no en `SpeciesRepository` porque la pregunta es sobre la
 * mezcla —«¿se puede retirar?»— y es lo que permite responder `409` antes de borrar, en lugar de
 * dejar saltar la clave foránea.
 */
interface SoilMixRepository {
  fun save(soilMix: SoilMix): SoilMix
  fun delete(soilMix: SoilMix)
  fun findOneById(id: SoilMixId): SoilMix?
  fun findAll(pageable: Pageable): Page<SoilMix>
  fun countSpeciesUsing(id: SoilMixId): Long
}

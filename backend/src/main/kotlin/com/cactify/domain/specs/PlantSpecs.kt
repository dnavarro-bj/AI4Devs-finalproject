package com.cactify.domain.specs

import com.cactify.domain.Environment
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantStatus
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.SunExposure
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
   * Las plantas de **cualquiera** de esas localizaciones: es el filtro por una localización y sus
   * descendientes. A diferencia del resto, un conjunto **vacío** no deja de filtrar sino que no
   * admite nada: significa «esa localización no existe», y no «sin filtro».
   */
  fun byLocations(locationIds: Set<LocationId>): Specification<Plant> =
    Specification { root, _, cb ->
      if (locationIds.isEmpty()) cb.disjunction() else root.get<Location>("location").get<LocationId>("id").`in`(locationIds)
    }

  /**
   * Los ejemplares en **cualquiera** de los estados indicados. El servicio decide qué pasa cuando no
   * se indica ninguno —por defecto, solo lo que está en curso—, así que aquí un conjunto vacío no
   * filtra, igual que en el resto de factorías.
   */
  fun byStatuses(statuses: Set<PlantStatus>): Specification<Plant> =
    Specification { root, _, _ ->
      if (statuses.isEmpty()) null else root.get<PlantStatus>("status").`in`(statuses)
    }

  /**
   * Coincidencia parcial sobre el código de inventario, sin distinguir mayúsculas: `gruss` encuentra
   * `CAT-GRUSS-01`. Un texto en blanco no filtra. El texto se trata como literal (ver [LikePattern]).
   */
  fun byCodeContaining(text: String?): Specification<Plant> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) {
        null
      } else {
        cb.like(cb.upper(root.get("code")), LikePattern.contains(needle.uppercase()), LikePattern.ESCAPE)
      }
    }

  /**
   * Texto libre: el ejemplar encaja si **cualquiera** de su código, su apodo y el nombre científico
   * o común de su especie contiene el texto, sin distinguir mayúsculas y con `%` y `_` como texto
   * (ver [LikePattern]). Un texto en blanco no filtra.
   *
   * La especie se alcanza con un `join` **propio** y no con el `fetch` de
   * [withSpeciesAndLocation]: la consulta de recuento de Spring Data omite ese `fetch`, y un
   * predicado que dependiera de él haría que el total no fuera el del filtro.
   */
  fun byText(text: String?): Specification<Plant> =
    Specification { root, _, cb ->
      val needle = text?.trim().orEmpty()
      if (needle.isEmpty()) {
        null
      } else {
        val pattern = LikePattern.contains(needle.uppercase())
        val species = root.join<Plant, Species>("species")
        cb.or(
          cb.like(cb.upper(root.get("code")), pattern, LikePattern.ESCAPE),
          cb.like(cb.upper(root.get("nickname")), pattern, LikePattern.ESCAPE),
          cb.like(cb.upper(species.get("scientificName")), pattern, LikePattern.ESCAPE),
          cb.like(cb.upper(species.get("commonName")), pattern, LikePattern.ESCAPE),
        )
      }
    }

  /** Los ejemplares de **cualquiera** de esas especies. Un conjunto vacío no filtra. */
  fun bySpecies(speciesIds: Set<SpeciesId>): Specification<Plant> =
    Specification { root, _, _ ->
      if (speciesIds.isEmpty()) null else root.get<Species>("species").get<SpeciesId>("id").`in`(speciesIds)
    }

  /**
   * Por la exposición y el entorno **de la especie** del ejemplar: encaja si los de su especie son
   * cualquiera de los indicados. Una especie sin definir (`NULL`) no encaja en ningún valor
   * concreto. Un conjunto vacío no filtra.
   */
  fun bySpeciesTraits(exposures: Set<SunExposure>, environments: Set<Environment>): Specification<Plant> =
    Specification { root, _, cb ->
      if (exposures.isEmpty() && environments.isEmpty()) {
        null
      } else {
        val species = root.join<Plant, Species>("species")
        val conditions = buildList {
          if (exposures.isNotEmpty()) add(species.get<SunExposure>("sunExposure").`in`(exposures))
          if (environments.isNotEmpty()) add(species.get<Environment>("environment").`in`(environments))
        }
        cb.and(*conditions.toTypedArray())
      }
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

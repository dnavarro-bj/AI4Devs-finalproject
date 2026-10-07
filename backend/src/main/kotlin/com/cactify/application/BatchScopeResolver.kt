package com.cactify.application

import com.cactify.domain.BatchScopeKind
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.PlantStatus
import com.cactify.domain.repos.LocationHierarchy
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.specs.PlantSpecs
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Component

/**
 * A quién se aplica un lote, tal como llega en el cuerpo. Es **exactamente una** de tres formas, y
 * `kind` dice cuál: una lista de plantas (`plants`), una localización (`location`, con o sin sus
 * sublocalizaciones) o una consulta de inventario (`query`, la *query string* del listado).
 */
data class BatchScopeRequest(
  val kind: String? = null,
  val plantIds: List<String>? = null,
  val locationId: String? = null,
  val includeDescendants: Boolean? = null,
  val query: String? = null,
)

/** Las plantas **en curso** de un alcance, por código, y cómo se eligieron. */
class ResolvedScope(val kind: BatchScopeKind, val plantIds: List<PlantId>)

/**
 * El único sitio que convierte un alcance en plantas. Lo usan la previsualización y la aplicación del
 * lote, de modo que **el número que se declara antes de guardar es, por construcción, el de las
 * plantas a las que luego se escribe**.
 *
 * Solo cuentan las plantas **en curso**: las archivadas (cedida, vendida, muerta o perdida) quedan
 * fuera aunque el alcance las incluya. Un alcance mayor que el máximo se rechaza **antes de leerlo**:
 * nunca se trunca. Debe llamarse dentro de una transacción: consulta la jerarquía.
 */
@Component
class BatchScopeResolver(
  private val plantRepository: PlantRepository,
  private val locationRepository: LocationRepository,
  private val hierarchy: LocationHierarchy,
  private val plantService: PlantService,
  @Value("\${cactify.batch.max-plants}") private val maxPlants: Int,
) {

  fun resolve(request: BatchScopeRequest?): ResolvedScope {
    require(request != null) { "El lote necesita un alcance: una lista de plantas, una localización o una consulta" }
    return when (request.kind?.trim()?.lowercase()) {
      "plants" -> fromPlants(request)
      "location" -> fromLocation(request)
      "query" -> fromQuery(request)
      else -> throw IllegalArgumentException(
        "'${request.kind}' no es un tipo de alcance válido: plants, location o query",
      )
    }
  }

  private fun fromPlants(request: BatchScopeRequest): ResolvedScope {
    require(request.locationId == null && request.query == null && request.includeDescendants == null) {
      "Un alcance de plantas no admite localización ni consulta"
    }
    val ids = request.plantIds.orEmpty().map { it.trim() }.distinct()
    require(ids.isNotEmpty()) { "Un alcance de plantas necesita al menos una planta" }
    if (ids.size > maxPlants) throw BatchTooLargeException(ids.size.toLong(), maxPlants)
    val wanted = ids.map { PlantId.from(it) }
    val found = plantRepository.findAllWithLocationByIdIn(wanted).associateBy { it.id }
    wanted.firstOrNull { it !in found }?.let { throw InvalidReferenceException("La planta", it.toString()) }
    val inProgress = found.values.filter { it.status in PlantStatus.inProgress }.sortedBy { it.code }
    return ResolvedScope(BatchScopeKind.Plants, inProgress.map { it.id })
  }

  private fun fromLocation(request: BatchScopeRequest): ResolvedScope {
    require(request.plantIds == null && request.query == null) { "Un alcance de localización no admite plantas ni consulta" }
    val raw = requireNotNull(request.locationId) { "Un alcance de localización necesita la localización" }
    val id = LocationId.from(raw)
    locationRepository.findOneById(id) ?: throw InvalidReferenceException("La localización", raw)
    val locations = if (request.includeDescendants == true) hierarchy.subtreeIds(id) else setOf(id)
    return ResolvedScope(BatchScopeKind.Location, read(PlantSpecs.byLocations(locations).and(inProgress())))
  }

  /**
   * El resultado del filtro, **entero**: no una página. La consulta se valida con los mismos criterios
   * que el listado y que una vista guardada; `page`, `size` y `sort` no forman parte del alcance y se
   * ignoran, aunque traigan un valor que por sí solo sería inválido.
   */
  private fun fromQuery(request: BatchScopeRequest): ResolvedScope {
    require(request.plantIds == null && request.locationId == null && request.includeDescendants == null) {
      "Un alcance de consulta no admite plantas ni localización"
    }
    val raw = requireNotNull(request.query) { "Un alcance de consulta necesita la consulta" }
    val params = CanonicalQuery.parameters(raw) - "sort"
    val criteria = PlantCriteria.fromQuery(params)
    return ResolvedScope(BatchScopeKind.Query, read(plantService.specification(criteria).and(inProgress())))
  }

  private fun inProgress(): Specification<Plant> = PlantSpecs.byStatuses(PlantStatus.inProgress)

  /** Cuenta antes de leer: por encima del máximo no se trae nada. Después, los identificadores por código. */
  private fun read(spec: Specification<Plant>): List<PlantId> {
    val total = plantRepository.count(spec)
    if (total > maxPlants) throw BatchTooLargeException(total, maxPlants)
    val ids = mutableListOf<PlantId>()
    var page = 0
    do {
      val result = plantRepository.findAll(spec, PageRequest.of(page++, PAGE, Sort.by("code")))
      ids += result.content.map { it.id }
    } while (result.hasNext())
    return ids
  }

  private companion object {
    const val PAGE = 500
  }
}

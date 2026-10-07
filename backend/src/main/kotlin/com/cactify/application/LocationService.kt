package com.cactify.application

import com.cactify.application.dto.LocationAncestorResponse
import com.cactify.application.dto.LocationChildResponse
import com.cactify.application.dto.LocationDetailResponse
import com.cactify.application.dto.LocationSummaryResponse
import com.cactify.application.dto.PageResponse
import com.cactify.domain.Location
import com.cactify.domain.LocationEnvironment
import com.cactify.domain.LocationExposure
import com.cactify.domain.LocationId
import com.cactify.domain.LocationType
import com.cactify.domain.repos.LocationHierarchy
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantMovementRepository
import com.cactify.domain.repos.TaskRepository
import com.cactify.domain.specs.LocationSpecs
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Casos de uso de las localizaciones (historias F.1 y 0.9). Como en el resto de servicios, el
 * mapeo a DTO ocurre **dentro** de la transacción: con `open-in-view: false` la sesión está
 * cerrada cuando el controller escribe la respuesta.
 *
 * La jerarquía es solo `parent_id`; ruta y recuentos salen de [LocationHierarchy] con un número de
 * consultas que no depende del de filas. Las reglas que consultan otras filas —el código único, que
 * el padre no sea un descendiente— viven aquí y no en la entidad (ADR-011).
 */
@Service
class LocationService(
  private val locationRepository: LocationRepository,
  private val hierarchy: LocationHierarchy,
  private val movementRepository: PlantMovementRepository,
  private val taskRepository: TaskRepository,
) {

  /** Lo que se indica al dar de alta o editar: todo texto del borde, los enums sin resolver. */
  data class LocationInput(
    val name: String,
    val code: String,
    val parentId: String? = null,
    val description: String? = null,
    val locationType: String? = null,
    val capacity: Int? = null,
    val operationalNotes: String? = null,
    val environment: String? = null,
    val sunExposure: String? = null,
  )

  @Transactional
  fun create(input: LocationInput): LocationDetailResponse {
    val parent = input.parentId?.let { requireParent(it) }
    requireCodeFree(input.code, except = null)
    val location = locationRepository.save(
      Location(
        name = input.name,
        code = input.code,
        parentId = parent?.id,
        description = input.description,
        locationType = input.locationType?.let { LocationType(it) },
        capacity = input.capacity,
        operationalNotes = input.operationalNotes,
        environment = input.environment?.let { LocationEnvironment(it) },
        sunExposure = input.sunExposure?.let { LocationExposure(it) },
      ),
    )
    return location.toDetail()
  }

  /**
   * El catálogo con la carga de cada sitio. Ruta y recuentos se piden **una sola vez** para la
   * página entera: son lo que sostiene el mapa del vivero, y pedirlos fila a fila sería un `N+1`.
   * `parentId` pide los hijos de un nodo; `rootsOnly`, las localizaciones sin padre.
   */
  @Transactional(readOnly = true)
  fun list(
    pageable: Pageable,
    parentId: String? = null,
    rootsOnly: Boolean = false,
    text: String? = null,
  ): PageResponse<LocationSummaryResponse> {
    val spec = LocationSpecs.byParent(parentId?.let { LocationId.from(it) })
      .and(LocationSpecs.rootsOnly(rootsOnly))
      .and(LocationSpecs.byText(text))
    val page = locationRepository.findAll(spec, pageable)
    val ids = page.content.map { it.id }
    val direct = locationRepository.countPlantsByLocation(ids).associate { it.locationId to it.plantCount }
    val totals = hierarchy.totalPlantCounts(ids)
    val paths = hierarchy.pathsOf(ids)

    return PageResponse.of(page) {
      LocationSummaryResponse(
        id = it.id.toString(),
        name = it.name,
        code = it.code,
        parentId = it.parentId?.toString(),
        path = paths[it.id] ?: it.name,
        locationType = it.locationType?.value,
        capacity = it.capacity,
        plantCount = direct[it.id] ?: 0,
        plantCountTotal = totals[it.id] ?: 0,
      )
    }
  }

  @Transactional(readOnly = true)
  fun findById(id: String): LocationDetailResponse = requireLocation(id).toDetail()

  /**
   * Reemplazo completo. Cambiar el padre **mueve la localización con todo su contenido** sin tocar
   * a nadie más: ruta y recuentos se calculan, y ningún ejemplar cambia de sitio. Hacerla hija de sí
   * misma o de un descendiente es un `409`.
   *
   * La comprobación del ciclo y su efecto van tras [LocationHierarchy.lockHierarchy]: dos ediciones
   * que por separado son válidas podrían formar un ciclo entre las dos, y el bloqueo las serializa.
   */
  @Transactional
  fun update(id: String, input: LocationInput): LocationDetailResponse {
    val location = requireLocation(id)
    hierarchy.lockHierarchy()
    val parent = input.parentId?.let { requireParent(it) }
    if (parent != null) requireNoCycle(location, parent)
    requireCodeFree(input.code, except = location.id)
    location.update(
      name = input.name,
      code = input.code,
      parentId = parent?.id,
      description = input.description,
      locationType = input.locationType?.let { LocationType(it) },
      capacity = input.capacity,
      operationalNotes = input.operationalNotes,
      environment = input.environment?.let { LocationEnvironment(it) },
      sunExposure = input.sunExposure?.let { LocationExposure(it) },
    )
    return location.toDetail()
  }

  /**
   * Retira la localización. Comprueba **antes** de borrar —ejemplares, sublocalizaciones, historial
   * de movimientos— y dice cuál lo impide: dejar que lo rechace la FK convertiría un caso
   * previsible en un 500, y un mensaje genérico no diría qué hay que vaciar.
   */
  @Transactional
  fun delete(id: String) {
    val location = requireLocation(id)
    if (locationRepository.countPlantsIn(location.id) > 0) throw LocationInUseException(id)
    if (locationRepository.countChildren(location.id) > 0) throw LocationHasChildrenException(id)
    if (movementRepository.existsByLocationId(location.id)) throw LocationInMovementsException(id)
    if (taskRepository.existsByLocationId(location.id)) throw LocationHasTasksException(id)
    locationRepository.delete(location)
  }

  private fun requireLocation(id: String): Location =
    locationRepository.findOneById(LocationId.from(id)) ?: throw LocationNotFoundException(id)

  /** Un padre que no existe es una referencia errónea del cuerpo: `400`, no `404`. */
  private fun requireParent(parentId: String): Location =
    locationRepository.findOneById(LocationId.from(parentId))
      ?: throw InvalidReferenceException("La localización padre", parentId)

  private fun requireNoCycle(location: Location, parent: Location) {
    val cycle = parent.id == location.id || hierarchy.ancestorsOf(parent.id).any { it.id == location.id }
    if (cycle) throw LocationHierarchyCycleException(location.id.toString(), parent.id.toString())
  }

  private fun requireCodeFree(code: String, except: LocationId?) {
    val other = locationRepository.findOneByCode(code.trim()) ?: return
    if (other.id != except) throw DuplicateLocationCodeException(code.trim())
  }

  private fun Location.toDetail(): LocationDetailResponse {
    val children = locationRepository.findByParentId(id, PageRequest.of(0, MAX_CHILDREN, Sort.by("name"))).content
    val ids = children.map { it.id } + id
    val direct = locationRepository.countPlantsByLocation(ids).associate { it.locationId to it.plantCount }
    val totals = hierarchy.totalPlantCounts(ids)
    return LocationDetailResponse(
      id = id.toString(),
      name = name,
      code = code,
      parentId = parentId?.toString(),
      description = description,
      locationType = locationType?.value,
      capacity = capacity,
      operationalNotes = operationalNotes,
      environment = environment?.value,
      sunExposure = sunExposure?.value,
      ancestors = hierarchy.ancestorsOf(id).map { LocationAncestorResponse(it.id.toString(), it.name) },
      children = children.map {
        LocationChildResponse(
          id = it.id.toString(),
          name = it.name,
          code = it.code,
          locationType = it.locationType?.value,
          plantCount = direct[it.id] ?: 0,
          plantCountTotal = totals[it.id] ?: 0,
        )
      },
      plantCount = direct[id] ?: 0,
      plantCountTotal = totals[id] ?: 0,
    )
  }

  private companion object {
    /** Tope de sublocalizaciones directas en la ficha: la lista es acotada por naturaleza, y ADR-009 pide un límite. */
    const val MAX_CHILDREN = 500
  }
}

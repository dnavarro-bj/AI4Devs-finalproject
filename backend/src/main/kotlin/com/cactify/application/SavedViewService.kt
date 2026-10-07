package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SavedViewResponse
import com.cactify.domain.SavedView
import com.cactify.domain.SavedViewId
import com.cactify.domain.ViewScope
import com.cactify.domain.repos.SavedViewRepository
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.specs.SavedViewSortKeys
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** El cuerpo de alta y de reemplazo de una vista: es el mismo, porque el reemplazo es completo. */
data class SavedViewRequest(
  val scope: String,
  val name: String,
  /** La *query string* de filtros y orden del listado de su ámbito; la paginación se descarta. */
  val query: String? = null,
  /** Solo en el ámbito `plants`: las claves de las columnas visibles. */
  val columns: List<String>? = null,
)

/**
 * Casos de uso de las vistas guardadas y de los grupos de especies. Como en el resto de servicios,
 * el mapeo a DTO ocurre **dentro** de la transacción.
 *
 * Una vista no puede quedar inservible: la consulta se interpreta con los mismos criterios que el
 * listado de su ámbito ([PlantCriteria], [SpeciesCriteria]) y se rechaza con `400` lo que el
 * listado rechazaría. Lo que se guarda es su forma canónica ([CanonicalQuery]).
 */
@Service
class SavedViewService(
  private val savedViewRepository: SavedViewRepository,
  private val speciesRepository: SpeciesRepository,
) {

  @Transactional
  fun create(request: SavedViewRequest): SavedViewResponse {
    val scope = ViewScope(request.scope)
    val query = interpret(scope, request.query)
    requireNameFree(scope, request.name, except = null)
    return savedViewRepository.save(SavedView(scope = scope, name = request.name, query = query, columns = request.columns))
      .toResponse()
  }

  /** Paginado (ADR-009), por nombre salvo que se pida otro orden. Un ámbito desconocido es un `400`. */
  @Transactional(readOnly = true)
  fun list(scope: String?, pageable: Pageable): PageResponse<SavedViewResponse> {
    val translated = SavedViewSortKeys.translate(pageable)
    val page = scope?.let { savedViewRepository.findAllByScope(ViewScope(it), translated) }
      ?: savedViewRepository.findAll(translated)
    return PageResponse.of(page) { it.toResponse() }
  }

  @Transactional(readOnly = true)
  fun findById(id: String): SavedViewResponse = requireView(id).toResponse()

  /** Reemplazo completo: conserva la identidad y la fecha de alta, y no deja nada de la consulta anterior. */
  @Transactional
  fun update(id: String, request: SavedViewRequest): SavedViewResponse {
    val view = requireView(id)
    val scope = ViewScope(request.scope)
    val query = interpret(scope, request.query)
    // Por identificador y no solo por nombre: quedarse con el propio nombre no es un conflicto.
    requireNameFree(scope, request.name, except = view.id)
    view.replace(scope, request.name, query, request.columns)
    return view.toResponse()
  }

  @Transactional
  fun delete(id: String) = savedViewRepository.delete(requireView(id))

  private fun requireView(id: String): SavedView =
    savedViewRepository.findOneById(SavedViewId.from(id)) ?: throw SavedViewNotFoundException(id)

  private fun requireNameFree(scope: ViewScope, name: String, except: SavedViewId?) {
    val existing = savedViewRepository.findByScopeAndNormalizedName(scope, name.trim().lowercase())
    if (existing != null && existing.id != except) throw DuplicateSavedViewNameException(name.trim(), scope.value)
  }

  /** La forma canónica de la consulta, tras comprobar que el listado de ese ámbito la serviría. */
  private fun interpret(scope: ViewScope, raw: String?): String {
    val canonical = CanonicalQuery.of(raw)
    val params = CanonicalQuery.parameters(canonical)
    when (scope) {
      ViewScope.Plants -> PlantCriteria.fromQuery(params)
      ViewScope.Species -> SpeciesCriteria.fromQuery(params)
    }
    return canonical
  }

  private fun SavedView.toResponse() = SavedViewResponse(
    id = id.toString(),
    scope = scope.value,
    name = name,
    query = query,
    columns = columns,
    matchCount = if (scope == ViewScope.Species) matchCount(query) else null,
    createdAt = createdAt,
    updatedAt = updatedAt,
  )

  /**
   * Cuántas especies cumplen la regla del grupo **hoy**: un recuento por grupo, no una consulta por
   * especie. Una regla que el listado ya no sabe interpretar —una clave retirada— no tumba el
   * listado de grupos: ese grupo sale sin recuento.
   */
  private fun matchCount(query: String): Long? =
    try {
      speciesRepository.count(SpeciesCriteria.fromQuery(CanonicalQuery.parameters(query)).toSpecification())
    } catch (ex: IllegalArgumentException) {
      null
    }
}

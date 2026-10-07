package com.cactify.domain.repos

import com.cactify.domain.SavedView
import com.cactify.domain.SavedViewId
import com.cactify.domain.ViewScope
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Puerto de acceso a las vistas guardadas. No expone `findAll()` sin paginar (ADR-009): una
 * colección con muchas vistas sigue siendo una página.
 */
interface SavedViewRepository {
  fun save(view: SavedView): SavedView
  fun delete(view: SavedView)
  fun findOneById(id: SavedViewId): SavedView?
  fun findAll(pageable: Pageable): Page<SavedView>
  fun findAllByScope(scope: ViewScope, pageable: Pageable): Page<SavedView>

  /** La vista de ese ámbito cuyo nombre normalizado (sin espacios de los extremos, en minúsculas) es `name`. */
  fun findByScopeAndNormalizedName(scope: ViewScope, name: String): SavedView?
}

package com.cactify.infrastructure.persistence

import com.cactify.domain.SavedView
import com.cactify.domain.SavedViewId
import com.cactify.domain.ViewScope
import com.cactify.domain.repos.SavedViewRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * Implementa el puerto extendiendo a la vez `JpaRepository`: `application` inyecta siempre
 * [SavedViewRepository], nunca este tipo.
 */
@Repository
interface JpaSavedViewRepository :
  SavedViewRepository,
  JpaRepository<SavedView, SavedViewId> {

  /** La normalización del nombre no sale del nombre del método, así que va como `@Query`. */
  @Query("SELECT v FROM SavedView v WHERE v.scope = :scope AND lower(trim(v.name)) = :name")
  override fun findByScopeAndNormalizedName(@Param("scope") scope: ViewScope, @Param("name") name: String): SavedView?
}

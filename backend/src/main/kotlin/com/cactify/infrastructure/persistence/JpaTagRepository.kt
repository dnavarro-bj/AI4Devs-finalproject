package com.cactify.infrastructure.persistence

import com.cactify.domain.Tag
import com.cactify.domain.TagId
import com.cactify.domain.repos.TagRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface JpaTagRepository :
  TagRepository,
  JpaRepository<Tag, TagId> {

  /** La normalización del nombre no sale del nombre del método, así que va como `@Query`. */
  @Query("SELECT t FROM Tag t WHERE lower(trim(t.name)) = :name")
  override fun findByNormalizedName(name: String): Tag?
}

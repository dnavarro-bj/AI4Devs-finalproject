package com.cactify.domain.repos

import com.cactify.domain.Tag
import com.cactify.domain.TagId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

interface TagRepository {
  fun save(tag: Tag): Tag
  fun findOneById(id: TagId): Tag?
  fun findAll(pageable: Pageable): Page<Tag>
  fun findByNormalizedName(name: String): Tag?
  fun findAllByIdIn(ids: Collection<TagId>): List<Tag>
}

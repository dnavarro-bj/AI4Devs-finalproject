package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TagResponse
import com.cactify.domain.Tag
import com.cactify.domain.TagName
import com.cactify.domain.repos.TagRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TagService(private val tagRepository: TagRepository) {

  @Transactional
  fun create(name: String): TagResponse {
    val normalized = TagName.normalize(name)
    if (tagRepository.findByNormalizedName(normalized) != null) {
      throw DuplicateTagNameException(TagName.display(name))
    }
    return tagRepository.save(Tag(name = TagName.display(name))).toResponse()
  }

  @Transactional(readOnly = true)
  fun list(pageable: Pageable): PageResponse<TagResponse> =
    PageResponse.of(tagRepository.findAll(pageable)) { it.toResponse() }

  private fun Tag.toResponse() = TagResponse(id = id.toString(), name = name)
}

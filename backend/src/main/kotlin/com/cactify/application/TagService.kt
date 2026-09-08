package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.TagDetailResponse
import com.cactify.application.dto.TagMergeResponse
import com.cactify.application.dto.TagResponse
import com.cactify.application.dto.TagSummaryResponse
import com.cactify.domain.Tag
import com.cactify.domain.TagId
import com.cactify.domain.TagName
import com.cactify.domain.repos.TagRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Casos de uso del catálogo de tags. Como en el resto de servicios, el mapeo a DTO ocurre
 * **dentro** de la transacción: con `open-in-view: false` la sesión está cerrada cuando el
 * controller escribe la respuesta.
 */
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

  /**
   * El catálogo con el uso de cada etiqueta. Los recuentos se piden **una sola vez** para la
   * página entera: pedirlos fila a fila sería un `N+1`.
   */
  @Transactional(readOnly = true)
  fun list(pageable: Pageable): PageResponse<TagSummaryResponse> {
    val page = tagRepository.findAll(pageable)
    val usage = tagRepository.countPlantsByTag(page.content.map { it.id })
      .associate { it.tagId to it.plantCount }

    return PageResponse.of(page) {
      TagSummaryResponse(id = it.id.toString(), name = it.name, plantCount = usage[it.id] ?: 0)
    }
  }

  /** La ficha lleva el recuento; el listado no, para no volverlo una consulta por fila. */
  @Transactional(readOnly = true)
  fun findById(id: String): TagDetailResponse {
    val tag = requireTag(id)
    return tag.toDetailResponse()
  }

  /**
   * Renombra comprobando la unicidad normalizada, igual que el alta.
   *
   * La comparación es **por identificador y no solo por nombre**: renombrar una etiqueta al nombre
   * que ya tenía no es un conflicto consigo misma, y es el error clásico de esta comprobación.
   */
  @Transactional
  fun rename(id: String, name: String): TagResponse {
    val tag = requireTag(id)
    val existing = tagRepository.findByNormalizedName(TagName.normalize(name))
    if (existing != null && existing.id != tag.id) {
      throw DuplicateTagNameException(TagName.display(name))
    }
    tag.rename(TagName.display(name))
    return tag.toResponse()
  }

  /**
   * Combina la etiqueta de origen en la de destino, en una sola transacción y en este orden:
   * descartar las asignaciones que colisionarían, reasignar el resto, y **solo entonces** borrar
   * el origen. Al revés se perderían plantas o saltaría la clave compuesta de `plant_tag`.
   *
   * Las plantas afectadas se cuentan **antes**: son todas las que tenían el origen, tanto las
   * reasignadas como las que ya tenían ambas y solo pierden la duplicada.
   */
  @Transactional
  fun merge(sourceId: String, targetId: String): TagMergeResponse {
    val source = requireTag(sourceId)
    val target = requireTag(targetId)
    if (source.id == target.id) throw TagMergeIntoItselfException(sourceId)

    val affected = tagRepository.countPlantsWith(source.id)
    tagRepository.removeDuplicateAssignments(source.id, target.id)
    tagRepository.reassignPlants(source.id, target.id)
    tagRepository.delete(source)

    return TagMergeResponse(target = target.toResponse(), affectedPlants = affected)
  }

  /**
   * Retira la etiqueta del catálogo. Comprueba el uso **antes** de borrar: aquí no hay una clave
   * foránea que fuese a proteger nada —`plant_tag` caería en cascada—, así que sin esta
   * comprobación el borrado se llevaría las asignaciones en silencio.
   */
  @Transactional
  fun delete(id: String) {
    val tag = requireTag(id)
    if (tagRepository.countPlantsWith(tag.id) > 0) throw TagInUseException(id)
    tagRepository.delete(tag)
  }

  private fun requireTag(id: String): Tag =
    tagRepository.findOneById(TagId.from(id)) ?: throw TagNotFoundException(id)

  private fun Tag.toResponse() = TagResponse(id = id.toString(), name = name)

  private fun Tag.toDetailResponse() = TagDetailResponse(
    id = id.toString(),
    name = name,
    normalizedName = TagName.normalize(name),
    plantCount = tagRepository.countPlantsWith(id),
  )
}

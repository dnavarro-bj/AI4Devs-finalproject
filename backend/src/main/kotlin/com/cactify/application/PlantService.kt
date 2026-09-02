package com.cactify.application

import com.cactify.application.dto.LocationResponse
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.PlantDetailResponse
import com.cactify.application.dto.PlantSummaryResponse
import com.cactify.application.dto.SpeciesCareResponse
import com.cactify.application.dto.SpeciesSummaryResponse
import com.cactify.application.dto.TagResponse
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.Tag
import com.cactify.domain.TagId
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.repos.TagRepository
import com.cactify.domain.specs.PlantSpecs
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * El mapeo a DTO ocurre **dentro** de la transacción (decisión 1 del design): con
 * `open-in-view: false` la sesión está cerrada cuando el controller escribe la respuesta, así que
 * todo lo que el DTO necesita se resuelve aquí o no se resuelve.
 */
@Service
class PlantService(
  private val plantRepository: PlantRepository,
  private val locationRepository: LocationRepository,
  private val speciesRepository: SpeciesRepository,
  private val tagRepository: TagRepository,
) {

  @Transactional
  fun create(nickname: String, locationId: String, speciesId: String): PlantDetailResponse {
    val location = requireLocation(locationId)
    val species = requireSpecies(speciesId)
    val plant = plantRepository.save(
      Plant(nickname = nickname.trim(), location = location, species = species),
    )
    return plant.toDetail()
  }

  @Transactional(readOnly = true)
  fun detail(id: String): PlantDetailResponse = requirePlant(id).toDetail()

  /**
   * Reemplazo completo del conjunto de tags. Se resuelven **todos** los ids antes de tocar nada,
   * para que un tag inválido no deje la planta a medio actualizar; Hibernate sincroniza las filas
   * de `plant_tag` al cerrar la transacción.
   */
  @Transactional
  fun replaceTags(id: String, tagIds: List<String>): PlantDetailResponse {
    val plant = requirePlant(id)
    plant.updateTags(resolveTags(tagIds))
    return plant.toDetail()
  }

  private fun resolveTags(tagIds: List<String>): Set<Tag> {
    if (tagIds.isEmpty()) return emptySet()
    val requested = tagIds.map { TagId.from(it) }.toSet()
    val found = tagRepository.findAllByIdIn(requested)
    val missing = requested - found.map { it.id }.toSet()
    if (missing.isNotEmpty()) {
      throw InvalidReferenceException("El tag", missing.joinToString(", ") { it.toString() })
    }
    return found.toSet()
  }

  @Transactional(readOnly = true)
  fun search(
    locationId: String?,
    tagIds: List<String>,
    pageable: Pageable,
  ): PageResponse<PlantSummaryResponse> {
    val spec = PlantSpecs
      .withSpeciesAndLocation()
      .and(PlantSpecs.byLocation(locationId?.let { LocationId.from(it) }))
      .and(PlantSpecs.byAllTags(tagIds.map { TagId.from(it) }.toSet()))
    return PageResponse.of(plantRepository.findAll(spec, pageable)) { it.toSummary() }
  }

  private fun requireLocation(locationId: String): Location =
    locationRepository.findOneById(LocationId.from(locationId))
      ?: throw InvalidReferenceException("La localización", locationId)

  private fun requireSpecies(speciesId: String): Species =
    speciesRepository.findOneById(SpeciesId.from(speciesId))
      ?: throw InvalidReferenceException("La especie", speciesId)

  private fun requirePlant(id: String): Plant =
    plantRepository.findOneById(PlantId.from(id)) ?: throw PlantNotFoundException(id)

  private fun Plant.toDetail() = PlantDetailResponse(
    id = id.toString(),
    nickname = nickname,
    createdAt = createdAt,
    location = LocationResponse(location.id.toString(), location.name),
    species = SpeciesCareResponse(
      id = species.id.toString(),
      scientificName = species.scientificName,
      commonName = species.commonName,
      minHumidity = species.minHumidity,
      maxHumidity = species.maxHumidity,
      minTemperature = species.minTemperature,
      maxTemperature = species.maxTemperature,
      minLightHours = species.minLightHours,
      maxLightHours = species.maxLightHours,
      wateringGuideline = species.wateringGuideline,
    ),
    tags = tags.map { TagResponse(it.id.toString(), it.name) }.sortedBy { it.name },
  )

  private fun Plant.toSummary() = PlantSummaryResponse(
    id = id.toString(),
    nickname = nickname,
    createdAt = createdAt,
    location = LocationResponse(location.id.toString(), location.name),
    species = SpeciesSummaryResponse(species.id.toString(), species.scientificName, species.commonName),
  )
}

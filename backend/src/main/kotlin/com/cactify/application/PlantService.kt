package com.cactify.application

import com.cactify.application.dto.CareOverridesResponse
import com.cactify.application.dto.EffectiveCareResponse
import com.cactify.application.dto.LocationResponse
import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.PlantDetailResponse
import com.cactify.application.dto.PlantStatusChangeResponse
import com.cactify.application.dto.PlantSummaryResponse
import com.cactify.application.dto.SoilMixSummaryResponse
import com.cactify.application.dto.SpeciesCareResponse
import com.cactify.application.dto.SpeciesSummaryResponse
import com.cactify.application.dto.TagResponse
import com.cactify.domain.CareOverrides
import com.cactify.domain.Location
import com.cactify.domain.LocationId
import com.cactify.domain.Plant
import com.cactify.domain.PlantId
import com.cactify.domain.PlantOrigin
import com.cactify.domain.PlantStatus
import com.cactify.domain.PlantStatusChange
import com.cactify.domain.Species
import com.cactify.domain.SoilMixId
import com.cactify.domain.SpeciesId
import com.cactify.domain.Tag
import com.cactify.domain.TagId
import com.cactify.domain.repos.LocationRepository
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.PlantStatusChangeRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.repos.TagRepository
import com.cactify.domain.specs.PlantSpecs
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

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
  private val statusChangeRepository: PlantStatusChangeRepository,
  private val soilMixRepository: SoilMixRepository,
  private val clock: Clock,
) {

  /**
   * Los cuidados propios tal y como entran: todo opcional, y la mezcla por identificador. Ausente
   * significa «hereda de la especie»; un objeto sin ningún valor es lo mismo que no enviarlo.
   */
  data class CareOverridesInput(
    val minHumidity: Int? = null,
    val maxHumidity: Int? = null,
    val minTemperature: Int? = null,
    val maxTemperature: Int? = null,
    val minLightHours: Int? = null,
    val maxLightHours: Int? = null,
    val wateringGuideline: String? = null,
    val soilMixId: String? = null,
  )

  /** Lo que se puede indicar al dar de alta o editar la ficha: todo opcional, todo texto del borde. */
  data class Profile(
    val description: String? = null,
    val germinationYear: Int? = null,
    val germinationMonth: Int? = null,
    val acquiredOn: LocalDate? = null,
    val origin: String? = null,
    val originNote: String? = null,
    val careOverrides: CareOverridesInput? = null,
  )

  @Transactional
  fun create(
    nickname: String,
    locationId: String,
    speciesId: String,
    profile: Profile = Profile(),
    status: String? = null,
  ): PlantDetailResponse {
    val location = requireLocation(locationId)
    // La especie con su fila bloqueada: serializa las altas de la misma especie, y el número se toma
    // y se guarda en la misma transacción que crea la planta. Se bloquea lo más tarde posible.
    val species = speciesRepository.findOneByIdForUpdate(SpeciesId.from(speciesId))
      ?: throw InvalidReferenceException("La especie", speciesId)
    val plant = plantRepository.save(
      Plant(
        code = species.nextPlantCode(),
        nickname = nickname.trim(),
        location = location,
        species = species,
        description = profile.description,
        status = status?.let { PlantStatus(it) } ?: PlantStatus.Active,
        germinationYear = profile.germinationYear,
        germinationMonth = profile.germinationMonth,
        acquiredOn = profile.acquiredOn,
        origin = profile.origin?.let { PlantOrigin(it) },
        originNote = profile.originNote,
        careOverrides = resolveCare(profile.careOverrides),
      ),
    )
    return plant.toDetail()
  }

  /**
   * Reemplazo completo de apodo, localización y especie. Se resuelve la planta (`404`) y **después**
   * las referencias (`400`), y solo entonces se muta: una referencia inválida no deja el apodo
   * aplicado a medias. La planta de la dirección manda sobre el contenido del cuerpo.
   */
  @Transactional
  fun update(
    id: String,
    nickname: String,
    locationId: String,
    speciesId: String,
    profile: Profile = Profile(),
  ): PlantDetailResponse {
    val plant = requirePlant(id)
    val location = requireLocation(locationId)
    val species = requireSpecies(speciesId)
    plant.update(
      nickname = nickname.trim(),
      location = location,
      species = species,
      description = profile.description,
      germinationYear = profile.germinationYear,
      germinationMonth = profile.germinationMonth,
      acquiredOn = profile.acquiredOn,
      origin = profile.origin?.let { PlantOrigin(it) },
      originNote = profile.originNote,
      careOverrides = resolveCare(profile.careOverrides),
    )
    return plant.toDetail()
  }

  /**
   * Cambia el estado y deja constancia. El método de dominio devuelve el cambio ya construido y aquí
   * solo se guarda: el estado y su historial no se pueden desincronizar. Una transición que el
   * dominio no admite es un `409`; un estado inexistente, un `400`.
   */
  @Transactional
  fun changeStatus(id: String, status: String, reason: String?): PlantDetailResponse {
    val plant = requirePlant(id)
    val change = plant.changeStatus(PlantStatus(status), reason, clock)
    statusChangeRepository.save(change)
    return plant.toDetail()
  }

  /** El historial de un ejemplar, del cambio más reciente al más antiguo (el orden lo fija el controller). */
  @Transactional(readOnly = true)
  fun statusChanges(id: String, pageable: Pageable): PageResponse<PlantStatusChangeResponse> {
    val plant = requirePlant(id)
    return PageResponse.of(statusChangeRepository.findByPlantId(plant.id, pageable)) { it.toResponse() }
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
    code: String?,
    pageable: Pageable,
    statuses: List<String> = emptyList(),
  ): PageResponse<PlantSummaryResponse> {
    // Lo archivado no se mezcla con lo que está en curso: sin filtro, solo lo que está en curso.
    val wanted = if (statuses.isEmpty()) PlantStatus.inProgress else statuses.map { PlantStatus(it) }.toSet()
    val spec = PlantSpecs
      .withSpeciesAndLocation()
      .and(PlantSpecs.byStatuses(wanted))
      .and(PlantSpecs.byCodeContaining(code))
      .and(PlantSpecs.byLocation(locationId?.let { LocationId.from(it) }))
      .and(PlantSpecs.byAllTags(tagIds.map { TagId.from(it) }.toSet()))
    return PageResponse.of(plantRepository.findAll(spec, pageable)) { it.toSummary() }
  }

  /** La mezcla propia, si la hay, tiene que existir: una referencia inválida es un `400`. */
  private fun resolveCare(input: CareOverridesInput?): CareOverrides? = input?.let {
    CareOverrides(
      minHumidity = it.minHumidity,
      maxHumidity = it.maxHumidity,
      minTemperature = it.minTemperature,
      maxTemperature = it.maxTemperature,
      minLightHours = it.minLightHours,
      maxLightHours = it.maxLightHours,
      wateringGuideline = it.wateringGuideline,
      soilMix = it.soilMixId?.let { id ->
        soilMixRepository.findOneById(SoilMixId.from(id)) ?: throw InvalidReferenceException("La mezcla de tierra", id)
      },
    )
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
    code = code,
    nickname = nickname,
    createdAt = createdAt,
    location = LocationResponse(location.id.toString(), location.name),
    species = SpeciesCareResponse(
      id = species.id.toString(),
      code = species.code,
      scientificName = species.scientificName,
      commonName = species.commonName,
      minHumidity = species.minHumidity,
      maxHumidity = species.maxHumidity,
      minTemperature = species.minTemperature,
      maxTemperature = species.maxTemperature,
      minLightHours = species.minLightHours,
      maxLightHours = species.maxLightHours,
      wateringGuideline = species.wateringGuideline,
      soilMix = SoilMixSummaryResponse(species.soilMix.id.toString(), species.soilMix.name),
    ),
    tags = tags.map { TagResponse(it.id.toString(), it.name) }.sortedBy { it.name },
    status = status.value,
    description = description,
    germinationYear = germinationYear,
    germinationMonth = germinationMonth,
    acquiredOn = acquiredOn,
    origin = origin?.value,
    originNote = originNote,
    careOverrides = careOverrides?.let {
      CareOverridesResponse(
        minHumidity = it.minHumidity,
        maxHumidity = it.maxHumidity,
        minTemperature = it.minTemperature,
        maxTemperature = it.maxTemperature,
        minLightHours = it.minLightHours,
        maxLightHours = it.maxLightHours,
        wateringGuideline = it.wateringGuideline,
        soilMixId = it.soilMix?.id?.toString(),
      )
    },
    effectiveCare = effectiveCare().let {
      EffectiveCareResponse(
        minHumidity = it.minHumidity,
        maxHumidity = it.maxHumidity,
        minTemperature = it.minTemperature,
        maxTemperature = it.maxTemperature,
        minLightHours = it.minLightHours,
        maxLightHours = it.maxLightHours,
        wateringGuideline = it.wateringGuideline,
        soilMix = SoilMixSummaryResponse(it.soilMix.id.toString(), it.soilMix.name),
        overridden = it.overridden,
      )
    },
  )

  private fun PlantStatusChange.toResponse() = PlantStatusChangeResponse(
    id = id.toString(),
    fromStatus = fromStatus.value,
    toStatus = toStatus.value,
    reason = reason,
    occurredAt = occurredAt,
  )

  private fun Plant.toSummary() = PlantSummaryResponse(
    id = id.toString(),
    code = code,
    status = status.value,
    nickname = nickname,
    createdAt = createdAt,
    location = LocationResponse(location.id.toString(), location.name),
    species = SpeciesSummaryResponse(species.id.toString(), species.code, species.scientificName, species.commonName),
  )
}

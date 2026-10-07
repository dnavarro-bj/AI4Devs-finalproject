package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SoilMixSummaryResponse
import com.cactify.application.dto.SpeciesCareResponse
import com.cactify.application.dto.SpeciesDetailResponse
import com.cactify.application.dto.SpeciesPeriodResponse
import com.cactify.application.dto.SpeciesSummaryResponse
import com.cactify.domain.CultivationProfile
import com.cactify.domain.Environment
import com.cactify.domain.InventoryCodes
import com.cactify.domain.PeriodSpec
import com.cactify.domain.PeriodType
import com.cactify.domain.SunExposure
import com.cactify.domain.WateringIntensity
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.MediaSummaries
import com.cactify.domain.repos.PhotoSummary
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SpeciesMediaRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
import com.cactify.domain.specs.SpeciesSortKeys
import com.cactify.domain.specs.SpeciesSpecs
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Los datos de una especie tal y como entran, compartidos por el alta y la edición: el `PUT` es
 * reemplazo completo, así que su cuerpo es idéntico al del `POST`.
 *
 * Vive en `application` junto a los DTO de respuesta, y `web` lo consume: la dirección permitida
 * por ADR-006 es `web → application`, así que el contrato de entrada puede vivir aquí igual que
 * ya vive el de salida.
 *
 * Los campos son **no nulos**: un campo ausente o a `null` lo rechaza Jackson y el manejador
 * global lo traduce a `400`, sin necesidad de `@NotNull` ni de desempaquetar nada aguas abajo.
 * Solo quedan las comprobaciones que Jackson no puede hacer —que un texto no venga en blanco—;
 * los rangos y su coherencia los defiende `Species` en su `init` (ADR-011), y no se duplican.
 */
data class SpeciesRequest(
  /**
   * El código de inventario (`CAT-GRUSS`): **obligatorio**, lo escribe quien da de alta la especie.
   * Nullable en el contrato para que su ausencia, igual que su vacío, sea un `400` con el mismo
   * mensaje: con un tipo no nulo, Jackson rechazaría la ausencia con un texto técnico.
   */
  @field:NotBlank(message = "el código es obligatorio")
  val code: String? = null,
  @field:NotBlank(message = "el nombre científico es obligatorio")
  val scientificName: String,
  @field:NotBlank(message = "el nombre común es obligatorio")
  val commonName: String,
  val minHumidity: Int,
  val maxHumidity: Int,
  val minTemperature: Int,
  val maxTemperature: Int,
  val minLightHours: Int,
  val maxLightHours: Int,
  @field:NotBlank(message = "la pauta de riego es obligatoria")
  val wateringGuideline: String,
  @field:NotBlank(message = "la mezcla de tierra es obligatoria")
  val soilMixId: String,
  val description: String? = null,
  /** `sombra`, `semisombra`, `soleado` o `pleno_sol`. Un valor desconocido es un `400`. */
  val sunExposure: String? = null,
  /** `interior`, `exterior` o `ambos`. */
  val environment: String? = null,
  val bloomDescription: String? = null,
  val bloomColor: String? = null,
  val bloomMaturity: String? = null,
  val bloomTypicalDuration: String? = null,
  /**
   * El calendario completo: **reemplaza** al guardado. Omitirlo deja la especie sin calendario,
   * como cualquier otro campo de un reemplazo completo.
   */
  val periods: List<PeriodRequest>? = null,
)

/** Un periodo del año tal y como entra. Inicio posterior al fin = cruza el fin de año. */
data class PeriodRequest(
  /** `crecimiento`, `reposo`, `floracion` o `riego`. */
  val type: String,
  val startMonth: Int,
  val endMonth: Int,
  /** Solo para `riego`: `escaso`, `moderado` o `abundante`. */
  val intensity: String? = null,
  val notes: String? = null,
)

/**
 * Casos de uso del catálogo de especies. Como en el resto de servicios, el mapeo a DTO ocurre
 * **dentro** de la transacción: con `open-in-view: false` la sesión está cerrada cuando el
 * controller escribe la respuesta.
 */
@Service
class SpeciesService(
  private val speciesRepository: SpeciesRepository,
  private val soilMixRepository: SoilMixRepository,
  private val plantRepository: PlantRepository,
  private val mediaSummaries: MediaSummaries,
  private val speciesMediaRepository: SpeciesMediaRepository,
  private val mediaService: MediaService,
) {

  @Transactional
  fun create(request: SpeciesRequest): SpeciesCareResponse {
    val scientificName = request.scientificName.trim()
    if (speciesRepository.findByScientificName(scientificName) != null) {
      throw DuplicateScientificNameException(scientificName)
    }
    val code = normalizedCode(request)
    if (speciesRepository.findByCode(code) != null) throw DuplicateSpeciesCodeException(code)
    val soilMix = requireSoilMix(request.soilMixId)
    val species = Species(
      code = code,
      scientificName = scientificName,
      commonName = request.commonName.trim(),
      minHumidity = request.minHumidity,
      maxHumidity = request.maxHumidity,
      minTemperature = request.minTemperature,
      maxTemperature = request.maxTemperature,
      minLightHours = request.minLightHours,
      maxLightHours = request.maxLightHours,
      wateringGuideline = request.wateringGuideline.trim(),
      soilMix = soilMix,
      profile = request.toProfile(),
      periods = request.toPeriods(),
    )
    return speciesRepository.save(species).toCare()
  }

  /**
   * Reemplazo completo de la ficha (decisión 9 del design). La comprobación de duplicado excluye
   * a la propia especie: conservar el nombre científico no es un conflicto.
   */
  @Transactional
  fun update(id: String, request: SpeciesRequest): SpeciesCareResponse {
    val species = requireSpecies(id)
    val scientificName = request.scientificName.trim()
    val clash = speciesRepository.findByScientificName(scientificName)
    if (clash != null && clash.id != species.id) {
      throw DuplicateScientificNameException(scientificName)
    }
    val code = normalizedCode(request)
    if (code != species.code) {
      // Ya identifica plantas: hay etiquetas pegadas en macetas que lo llevan. Enviar el mismo
      // código no es un cambio, y se acepta aunque haya ejemplares.
      if (plantRepository.existsBySpeciesId(species.id)) throw SpeciesCodeLockedException(species.code)
      val taken = speciesRepository.findByCode(code)
      if (taken != null && taken.id != species.id) throw DuplicateSpeciesCodeException(code)
    }
    species.update(
      code = code,
      scientificName = scientificName,
      commonName = request.commonName.trim(),
      minHumidity = request.minHumidity,
      maxHumidity = request.maxHumidity,
      minTemperature = request.minTemperature,
      maxTemperature = request.maxTemperature,
      minLightHours = request.minLightHours,
      maxLightHours = request.maxLightHours,
      wateringGuideline = request.wateringGuideline.trim(),
      soilMix = requireSoilMix(request.soilMixId),
      profile = request.toProfile(),
      periods = request.toPeriods(),
    )
    return species.toCare()
  }

  /**
   * Retira la especie del catálogo. Comprueba los ejemplares **antes** de borrar: dejar que lo
   * rechace la FK convertiría un caso previsible en un 500 (decisión 10 del design).
   */
  @Transactional
  fun delete(id: String) {
    val species = requireSpecies(id)
    if (plantRepository.existsBySpeciesId(species.id)) throw SpeciesInUseException(id)
    // Sus fotografías se retiran con ella: las filas ahora y los archivos, solo si se confirma.
    speciesMediaRepository.findAllBySpeciesIdOrderByPositionAsc(species.id).forEach {
      speciesMediaRepository.delete(it)
      mediaService.delete(it.asset)
    }
    speciesMediaRepository.flush()
    speciesRepository.delete(species)
  }

  @Transactional(readOnly = true)
  fun list(criteria: SpeciesCriteria, pageable: Pageable): PageResponse<SpeciesSummaryResponse> =
    // El orden se pide con claves públicas y se traduce aquí (ADR-016), antes de tocar el repositorio.
    speciesRepository.findAll(criteria.toSpecification(), SpeciesSortKeys.translate(pageable)).let { page ->
      // Portada y recuento de toda la página con UNA consulta agregada, no una por fila (ADR-009).
      val photos = mediaSummaries.bySpecies(page.content.map { it.id })
      PageResponse.of(page) { it.toSummary(photos[it.id] ?: PhotoSummary.NONE) }
    }

  @Transactional(readOnly = true)
  fun findById(id: String): SpeciesDetailResponse {
    val species = requireSpecies(id)
    return species.toDetail(
      plantRepository.countBySpeciesId(species.id),
      mediaSummaries.bySpecies(listOf(species.id))[species.id] ?: PhotoSummary.NONE,
    )
  }

  private fun SpeciesRequest.toProfile() = CultivationProfile(
    description = description,
    sunExposure = sunExposure?.let { SunExposure(it) },
    environment = environment?.let { Environment(it) },
    bloomDescription = bloomDescription,
    bloomColor = bloomColor,
    bloomMaturity = bloomMaturity,
    bloomTypicalDuration = bloomTypicalDuration,
  )

  /** Un tipo, una intensidad o un mes inválidos son `IllegalArgumentException`, es decir, `400`. */
  private fun SpeciesRequest.toPeriods() = (periods ?: emptyList()).map {
    PeriodSpec(
      type = PeriodType(it.type),
      startMonth = it.startMonth,
      endMonth = it.endMonth,
      intensity = it.intensity?.let { value -> WateringIntensity(value) },
      notes = it.notes,
    )
  }

  /** Mayúsculas y sin espacios en los extremos; la presencia ya la garantiza `@NotBlank`. */
  private fun normalizedCode(request: SpeciesRequest): String =
    InventoryCodes.normalize(requireNotNull(request.code) { "el código es obligatorio" })

  private fun requireSoilMix(soilMixId: String): SoilMix =
    soilMixRepository.findOneById(SoilMixId.from(soilMixId))
      ?: throw InvalidReferenceException("La mezcla de tierra", soilMixId)

  private fun requireSpecies(id: String): Species =
    speciesRepository.findOneById(SpeciesId.from(id)) ?: throw SpeciesNotFoundException(id)

  private fun Species.toSummary(photos: PhotoSummary) =
    SpeciesSummaryResponse(id.toString(), code, scientificName, commonName, photos.primary?.toResponse(), photos.count)

  /**
   * Reutiliza el DTO que ya sirve `GET /plants/{id}`, sin duplicarlo.
   *
   * La mezcla **sí** viaja ahora: la decisión 3 del design de T-08 la dejó fuera mientras nadie la
   * consumiera, y dejó escrito que se añadiría al existir el catálogo de mezclas. Ese momento es
   * este. El `N+1` que temía no aplica: este DTO solo aparece en fichas de una entidad —`/species/{id}`
   * y anidado en `/plants/{id}`—; los listados usan `SpeciesSummaryResponse`, que no la lleva.
   */
  private fun Species.toDetail(plantCount: Long, photos: PhotoSummary) = SpeciesDetailResponse(
    id = id.toString(),
    code = code,
    scientificName = scientificName,
    commonName = commonName,
    minHumidity = minHumidity,
    maxHumidity = maxHumidity,
    minTemperature = minTemperature,
    maxTemperature = maxTemperature,
    minLightHours = minLightHours,
    maxLightHours = maxLightHours,
    wateringGuideline = wateringGuideline,
    soilMix = SoilMixSummaryResponse(soilMix.id.toString(), soilMix.name),
    plantCount = plantCount,
    description = description,
    sunExposure = sunExposure?.value,
    environment = environment?.value,
    bloomDescription = bloomDescription,
    bloomColor = bloomColor,
    bloomMaturity = bloomMaturity,
    bloomTypicalDuration = bloomTypicalDuration,
    periods = periods.map {
      SpeciesPeriodResponse(it.id.toString(), it.type.value, it.startMonth, it.endMonth, it.intensity?.value, it.notes)
    },
    primaryPhoto = photos.primary?.toResponse(),
    photoCount = photos.count,
  )

  private fun Species.toCare() = SpeciesCareResponse(
    id = id.toString(),
    code = code,
    scientificName = scientificName,
    commonName = commonName,
    minHumidity = minHumidity,
    maxHumidity = maxHumidity,
    minTemperature = minTemperature,
    maxTemperature = maxTemperature,
    minLightHours = minLightHours,
    maxLightHours = maxLightHours,
    wateringGuideline = wateringGuideline,
    soilMix = SoilMixSummaryResponse(soilMix.id.toString(), soilMix.name),
  )
}

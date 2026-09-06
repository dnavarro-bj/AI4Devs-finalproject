package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SoilMixSummaryResponse
import com.cactify.application.dto.SpeciesCareResponse
import com.cactify.application.dto.SpeciesSummaryResponse
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.Species
import com.cactify.domain.SpeciesId
import com.cactify.domain.repos.PlantRepository
import com.cactify.domain.repos.SoilMixRepository
import com.cactify.domain.repos.SpeciesRepository
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
) {

  @Transactional
  fun create(request: SpeciesRequest): SpeciesCareResponse {
    val scientificName = request.scientificName.trim()
    if (speciesRepository.findByScientificName(scientificName) != null) {
      throw DuplicateScientificNameException(scientificName)
    }
    val soilMix = requireSoilMix(request.soilMixId)
    val species = Species(
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
    species.update(
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
    speciesRepository.delete(species)
  }

  @Transactional(readOnly = true)
  fun list(pageable: Pageable): PageResponse<SpeciesSummaryResponse> =
    PageResponse.of(speciesRepository.findAll(pageable)) { it.toSummary() }

  @Transactional(readOnly = true)
  fun findById(id: String): SpeciesCareResponse = requireSpecies(id).toCare()

  private fun requireSoilMix(soilMixId: String): SoilMix =
    soilMixRepository.findOneById(SoilMixId.from(soilMixId))
      ?: throw InvalidReferenceException("La mezcla de tierra", soilMixId)

  private fun requireSpecies(id: String): Species =
    speciesRepository.findOneById(SpeciesId.from(id)) ?: throw SpeciesNotFoundException(id)

  private fun Species.toSummary() =
    SpeciesSummaryResponse(id.toString(), scientificName, commonName)

  /**
   * Reutiliza el DTO que ya sirve `GET /plants/{id}`, sin duplicarlo.
   *
   * La mezcla **sí** viaja ahora: la decisión 3 del design de T-08 la dejó fuera mientras nadie la
   * consumiera, y dejó escrito que se añadiría al existir el catálogo de mezclas. Ese momento es
   * este. El `N+1` que temía no aplica: este DTO solo aparece en fichas de una entidad —`/species/{id}`
   * y anidado en `/plants/{id}`—; los listados usan `SpeciesSummaryResponse`, que no la lleva.
   */
  private fun Species.toCare() = SpeciesCareResponse(
    id = id.toString(),
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

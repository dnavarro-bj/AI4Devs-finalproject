package com.cactify.application

import com.cactify.application.dto.PageResponse
import com.cactify.application.dto.SoilMixDetailResponse
import com.cactify.application.dto.SoilMixResponse
import com.cactify.domain.SoilMix
import com.cactify.domain.SoilMixId
import com.cactify.domain.repos.SoilMixRepository
import jakarta.validation.constraints.NotBlank
import java.math.BigDecimal
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Los datos de una mezcla tal y como entran, compartidos por el alta y la corrección: el `PUT` es
 * reemplazo completo, así que su cuerpo es idéntico al del `POST`.
 *
 * Vive en `application` junto a los DTO de respuesta, igual que `SpeciesRequest`: la dirección
 * permitida por ADR-006 es `web → application`.
 *
 * Los campos son **no nulos** salvo la descripción, que sí puede faltar: un campo ausente lo
 * rechaza Jackson y el manejador global lo traduce a `400`. La composición —que los porcentajes
 * sumen 100 y que el pH esté en escala— la defiende `SoilMix` en su `validate` (ADR-011), y no se
 * duplica aquí.
 */
data class SoilMixRequest(
  @field:NotBlank(message = "el nombre de la mezcla es obligatorio")
  val name: String,
  val organicPercentage: Int,
  val mineralPercentage: Int,
  val phMin: BigDecimal,
  val phMax: BigDecimal,
  val description: String? = null,
)

/**
 * Casos de uso del catálogo de mezclas de tierra (historia 0.8). Como en el resto de servicios,
 * el mapeo a DTO ocurre **dentro** de la transacción: con `open-in-view: false` la sesión está
 * cerrada cuando el controller escribe la respuesta.
 */
@Service
class SoilMixService(private val soilMixRepository: SoilMixRepository) {

  @Transactional
  fun create(request: SoilMixRequest): SoilMixResponse = soilMixRepository.save(
    SoilMix(
      name = request.name.trim(),
      organicPercentage = request.organicPercentage,
      mineralPercentage = request.mineralPercentage,
      phMin = request.phMin,
      phMax = request.phMax,
      description = request.description?.trim()?.ifBlank { null },
    ),
  ).toResponse()

  /** Reemplazo completo de la receta; la entidad revalida antes de tocar nada. */
  @Transactional
  fun update(id: String, request: SoilMixRequest): SoilMixResponse {
    val soilMix = requireSoilMix(id)
    soilMix.update(
      name = request.name.trim(),
      organicPercentage = request.organicPercentage,
      mineralPercentage = request.mineralPercentage,
      phMin = request.phMin,
      phMax = request.phMax,
      description = request.description?.trim()?.ifBlank { null },
    )
    return soilMix.toResponse()
  }

  /**
   * Retira la mezcla del catálogo. Comprueba las especies que la recomiendan **antes** de borrar:
   * dejar que lo rechace la FK convertiría un caso previsible en un 500, igual que en especies.
   */
  @Transactional
  fun delete(id: String) {
    val soilMix = requireSoilMix(id)
    if (soilMixRepository.countSpeciesUsing(soilMix.id) > 0) throw SoilMixInUseException(id)
    soilMixRepository.delete(soilMix)
  }

  @Transactional(readOnly = true)
  fun list(pageable: Pageable): PageResponse<SoilMixResponse> =
    PageResponse.of(soilMixRepository.findAll(pageable)) { it.toResponse() }

  /** La ficha lleva el recuento de especies; el listado no, para no volverlo una consulta por fila. */
  @Transactional(readOnly = true)
  fun findById(id: String): SoilMixDetailResponse {
    val soilMix = requireSoilMix(id)
    return SoilMixDetailResponse(
      id = soilMix.id.toString(),
      name = soilMix.name,
      organicPercentage = soilMix.organicPercentage,
      mineralPercentage = soilMix.mineralPercentage,
      phMin = soilMix.phMin,
      phMax = soilMix.phMax,
      description = soilMix.description,
      speciesCount = soilMixRepository.countSpeciesUsing(soilMix.id),
    )
  }

  private fun requireSoilMix(id: String): SoilMix =
    soilMixRepository.findOneById(SoilMixId.from(id)) ?: throw SoilMixNotFoundException(id)

  private fun SoilMix.toResponse() = SoilMixResponse(
    id = id.toString(),
    name = name,
    organicPercentage = organicPercentage,
    mineralPercentage = mineralPercentage,
    phMin = phMin,
    phMax = phMax,
    description = description,
  )
}

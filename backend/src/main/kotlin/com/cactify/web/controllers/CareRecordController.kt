package com.cactify.web.controllers

import com.cactify.application.CareRecordService
import com.cactify.application.dto.CareRecordResponse
import com.cactify.application.dto.PageResponse
import com.cactify.web.validation.NotFarInFuture
import jakarta.validation.Valid
import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.SortDefault
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.Instant

/**
 * Cuerpo del alta de una lectura. Los cinco valores y la fecha son opcionales por separado; lo que
 * no se admite es una lectura sin ningún valor.
 */
data class CreateCareRecordRequest(
  @field:Min(0, message = "la humedad no puede ser negativa")
  @field:Max(100, message = "la humedad no puede pasar de 100")
  val humidity: Int? = null,

  @field:Min(-50, message = "la temperatura es implausible")
  @field:Max(80, message = "la temperatura es implausible")
  val temperature: Int? = null,

  @field:Min(0, message = "las horas de luz no pueden ser negativas")
  @field:Max(24, message = "las horas de luz no pueden pasar de 24")
  val lightHours: Int? = null,

  @field:Min(0, message = "la cantidad de riego no puede ser negativa")
  val waterAmountMl: Int? = null,

  @field:DecimalMin("0.0", message = "la acidez está fuera de la escala de pH")
  @field:DecimalMax("14.0", message = "la acidez está fuera de la escala de pH")
  val soilPh: BigDecimal? = null,

  @field:NotFarInFuture(message = "no puede estar en el futuro")
  val recordedAt: Instant? = null,
) {
  /** Una lectura sin ningún valor no es una lectura. */
  @get:AssertTrue(message = "la lectura debe llevar al menos un valor")
  val atLeastOneValue: Boolean
    get() = listOfNotNull(humidity, temperature, lightHours, waterAmountMl, soilPh).isNotEmpty()
}

@RestController
@RequestMapping("/plants/{id}/care-records")
class CareRecordController(private val careRecordService: CareRecordService) {

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  fun create(
    @PathVariable id: String,
    @Valid @RequestBody request: CreateCareRecordRequest,
  ): CareRecordResponse = careRecordService.create(id, request.toCommand())

  /**
   * De la más reciente a la más antigua, con desempate estable: `recorded_at` puede repetirse —un
   * envío en lote trae varias con el mismo sello— y sin segundo criterio dos páginas consecutivas
   * podrían repetir u omitir filas. El desempate se escribe `id.id` porque el identificador es un
   * embebido y el valor ordenable es su atributo interno.
   *
   * Va en `@SortDefault` y no en `@PageableDefault`: este último fija además el tamaño de página y
   * taparía el `default-page-size` configurado.
   */
  @GetMapping
  fun list(
    @PathVariable id: String,
    @SortDefault(sort = ["recordedAt", "id.id"], direction = Sort.Direction.DESC) pageable: Pageable,
  ): PageResponse<CareRecordResponse> = careRecordService.list(id, pageable)
}

/** Lo que el servicio necesita, sin arrastrar el cuerpo HTTP hasta `application`. */
fun CreateCareRecordRequest.toCommand() = CareRecordService.NewCareRecord(
  humidity = humidity,
  temperature = temperature,
  lightHours = lightHours,
  waterAmountMl = waterAmountMl,
  soilPh = soilPh,
  recordedAt = recordedAt,
)

package com.cactify.web.errors

import com.cactify.application.AIProviderException
import com.cactify.application.CareRecordNotFoundException
import com.cactify.application.DuplicateScientificNameException
import com.cactify.application.DuplicateTagNameException
import com.cactify.application.InvalidReferenceException
import com.cactify.application.LocationInUseException
import com.cactify.application.LocationNotFoundException
import com.cactify.application.PlantNotFoundException
import com.cactify.application.RecommendationNotFoundException
import com.cactify.application.SoilMixInUseException
import com.cactify.application.SoilMixNotFoundException
import com.cactify.application.SpeciesInUseException
import com.cactify.application.SpeciesNotFoundException
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException

/** Cuerpo de error uniforme del API (decisión 5 del design). */
data class ErrorResponse(
  val status: Int,
  val error: String,
  val message: String,
  val path: String,
)

/**
 * Traduce a la forma de error uniforme. La regla: lo que falta en la **ruta** es 404; lo que es
 * inválido en el **cuerpo o los parámetros** es 400. Nada de esto puede acabar en un 500.
 */
@RestControllerAdvice
class ApiExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException::class)
  fun onValidationError(ex: MethodArgumentNotValidException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
    val message = ex.bindingResult.fieldErrors
      .joinToString(", ") { "${it.field}: ${it.defaultMessage}" }
      .ifBlank { "La petición no es válida" }
    return badRequest(message, request)
  }

  /**
   * `NumberFormatException` es lo que lanza `XId.from(...)` ante una cadena que no es un
   * identificador; llega envuelta cuando viene del cuerpo JSON y desnuda desde un `@PathVariable`.
   */
  @ExceptionHandler(NumberFormatException::class)
  fun onMalformedIdentifier(ex: NumberFormatException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    badRequest("Identificador con formato inválido: ${ex.message}", request)

  @ExceptionHandler(HttpMessageNotReadableException::class)
  fun onUnreadableBody(ex: HttpMessageNotReadableException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    badRequest(rootMessage(ex) ?: "El cuerpo de la petición no es válido", request)

  @ExceptionHandler(MethodArgumentTypeMismatchException::class)
  fun onTypeMismatch(ex: MethodArgumentTypeMismatchException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    badRequest("Parámetro '${ex.name}' con formato inválido", request)

  /**
   * Una invariante del dominio rechazada. El dato que llega sigue siendo inválido, así que la
   * respuesta es `400` como cualquier otro cuerpo mal formado; pero se registra, porque llegar
   * hasta aquí significa que la validación de `web` y la regla del dominio han divergido.
   */
  @ExceptionHandler(IllegalArgumentException::class)
  fun onDomainInvariant(ex: IllegalArgumentException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
    log.warn("Invariante de dominio rechazada en {}: {}", request.requestURI, ex.message)
    return badRequest(ex.message ?: "La petición no es válida", request)
  }

  @ExceptionHandler(InvalidReferenceException::class)
  fun onInvalidReference(ex: InvalidReferenceException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    badRequest(ex.message ?: "Referencia inválida", request)

  @ExceptionHandler(PlantNotFoundException::class)
  fun onPlantNotFound(ex: PlantNotFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado", request)

  @ExceptionHandler(SpeciesNotFoundException::class)
  fun onSpeciesNotFound(ex: SpeciesNotFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado", request)

  @ExceptionHandler(LocationNotFoundException::class)
  fun onLocationNotFound(ex: LocationNotFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado", request)

  @ExceptionHandler(SoilMixNotFoundException::class)
  fun onSoilMixNotFound(ex: SoilMixNotFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado", request)

  @ExceptionHandler(CareRecordNotFoundException::class)
  fun onCareRecordNotFound(ex: CareRecordNotFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado", request)

  @ExceptionHandler(RecommendationNotFoundException::class)
  fun onRecommendationNotFound(ex: RecommendationNotFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado", request)

  /**
   * El proveedor de IA falló. Es `502` y no `500`: el sistema aguas arriba no dio una respuesta
   * utilizable, y no es culpa nuestra ni del cliente.
   */
  @ExceptionHandler(AIProviderException::class)
  fun onAIProviderFailure(ex: AIProviderException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
    log.warn("El proveedor de IA falló en {}: {}", request.requestURI, ex.message)
    return body(HttpStatus.BAD_GATEWAY, ex.message ?: "El proveedor de análisis no está disponible", request)
  }

  @ExceptionHandler(NoResourceFoundException::class)
  fun onNoResource(ex: NoResourceFoundException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.NOT_FOUND, "Recurso no encontrado", request)

  @ExceptionHandler(DuplicateTagNameException::class)
  fun onDuplicateTagName(ex: DuplicateTagNameException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.CONFLICT, ex.message ?: "El recurso ya existe", request)

  @ExceptionHandler(SpeciesInUseException::class)
  fun onSpeciesInUse(ex: SpeciesInUseException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.CONFLICT, ex.message ?: "El recurso está en uso", request)

  @ExceptionHandler(LocationInUseException::class)
  fun onLocationInUse(ex: LocationInUseException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.CONFLICT, ex.message ?: "El recurso está en uso", request)

  @ExceptionHandler(SoilMixInUseException::class)
  fun onSoilMixInUse(ex: SoilMixInUseException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.CONFLICT, ex.message ?: "El recurso está en uso", request)

  @ExceptionHandler(DuplicateScientificNameException::class)
  fun onDuplicateScientificName(ex: DuplicateScientificNameException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    body(HttpStatus.CONFLICT, ex.message ?: "El recurso ya existe", request)

  /**
   * Cierra la carrera entre la comprobación de duplicado y el `INSERT`: dos altas simultáneas con
   * el mismo nombre científico pasan las dos por `findByScientificName`, y a la segunda la rechaza
   * el `UNIQUE` de `V6__` al vaciar la sesión, ya fuera del servicio. Es el mismo `409` por el
   * mismo motivo, llegue por la comprobación o por la restricción.
   *
   * Solo esa restricción: cualquier otra violación de integridad sigue siendo un fallo nuestro y
   * se propaga, en vez de disfrazarse de conflicto del cliente.
   */
  @ExceptionHandler(DataIntegrityViolationException::class)
  fun onIntegrityViolation(ex: DataIntegrityViolationException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
    if (SPECIES_NAME_CONSTRAINT !in (rootMessage(ex) ?: "")) throw ex
    log.warn("Nombre científico duplicado detectado por la restricción en {}", request.requestURI)
    return body(HttpStatus.CONFLICT, "Ya existe una especie con ese nombre científico", request)
  }

  private fun badRequest(message: String, request: HttpServletRequest) =
    body(HttpStatus.BAD_REQUEST, message, request)

  private fun body(status: HttpStatus, message: String, request: HttpServletRequest) =
    ResponseEntity.status(status).body(
      ErrorResponse(
        status = status.value(),
        error = status.reasonPhrase,
        message = message,
        path = request.requestURI,
      ),
    )

  private companion object {
    val log = LoggerFactory.getLogger(ApiExceptionHandler::class.java)
    const val SPECIES_NAME_CONSTRAINT = "species_scientific_name_unique"
  }

  private fun rootMessage(ex: Throwable): String? {
    var cause: Throwable? = ex
    while (cause?.cause != null) cause = cause.cause
    return cause?.message
  }
}

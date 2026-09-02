package com.cactify.web.validation

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import org.springframework.beans.factory.annotation.Value
import java.time.Clock
import java.time.Duration
import java.time.Instant
import kotlin.reflect.KClass

/**
 * La fecha no puede estar por delante del reloj del servidor más allá del margen configurado.
 *
 * Va como restricción de Bean Validation y no como comprobación en el servicio para que el fallo
 * llegue por el mismo camino que el resto de la validación del cuerpo: `400` con el cuerpo
 * uniforme y el nombre del campo, sin añadir ninguna excepción ni ningún `@ExceptionHandler`.
 */
@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [NotFarInFutureValidator::class])
annotation class NotFarInFuture(
  val message: String = "no puede estar en el futuro",
  val groups: Array<KClass<*>> = [],
  val payload: Array<KClass<out Payload>> = [],
)

/**
 * Spring inyecta las dependencias de los validadores de Bean Validation, así que este toma el
 * único `Clock` del sistema (ADR-010) y el margen configurado.
 */
class NotFarInFutureValidator(
  private val clock: Clock,
  @Value("\${cactify.care-records.max-future-skew}") private val maxFutureSkew: Duration,
) : ConstraintValidator<NotFarInFuture, Instant> {

  override fun isValid(value: Instant?, context: ConstraintValidatorContext?): Boolean =
    value == null || !value.isAfter(clock.instant().plus(maxFutureSkew))
}

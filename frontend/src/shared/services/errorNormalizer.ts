import { ApiError } from '@shared/services/httpClient'
import { type DomainError, domainError, ErrorCodes } from '@shared/types/api.types'

/**
 * La frontera entre el transporte y el dominio (ADR-015): convierte lo que lanza `httpClient` en
 * el `DomainError` que devuelven los services.
 *
 * El código sale del `status`, que es lo único que el API garantiza como estructura: el cuerpo
 * uniforme lleva `message` pintable pero no un código propio. Cuando el backend gane uno, se
 * cambia aquí y en ningún otro sitio.
 */
export function normalizeError(cause: unknown): DomainError {
  if (cause instanceof ApiError) {
    return domainError(codeForStatus(cause.status), cause.message, cause.status)
  }

  // No debería ocurrir —`httpClient` envuelve todo— pero un service nunca lanza, ni siquiera aquí.
  return domainError(
    ErrorCodes.UNKNOWN,
    cause instanceof Error ? cause.message : 'No se ha podido completar la operación.',
  )
}

function codeForStatus(status: number): string {
  // `0` es el fallo de red: no hubo respuesta, así que no hay `status` que interpretar.
  if (status === 0) return ErrorCodes.NETWORK_ERROR
  if (status === 404) return ErrorCodes.NOT_FOUND
  if (status === 409) return ErrorCodes.CONFLICT
  if (status === 502) return ErrorCodes.UPSTREAM_ERROR
  if (status >= 400 && status < 500) return ErrorCodes.VALIDATION_ERROR
  if (status >= 500) return ErrorCodes.SERVER_ERROR
  return ErrorCodes.UNKNOWN
}

/** Un `404` de «todavía no existe» no siempre es un error de la pantalla. */
export function isNotFound(error: DomainError | null): boolean {
  return error?.code === ErrorCodes.NOT_FOUND
}

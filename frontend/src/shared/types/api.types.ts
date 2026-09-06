/**
 * El contrato entre un service y su composable (ADR-015).
 *
 * **Los errores viajan como valor, no como excepción.** Un service devuelve siempre un
 * `ServiceResponse` y nunca lanza, de modo que el fallo queda en la firma: no hay `try/catch` que
 * se pueda olvidar, hay un `if (!result.success)` que el tipo obliga a mirar.
 */

export interface ServiceResponse<T> {
  success: boolean
  data: T | null
  error: DomainError | null
}

/** Un fallo ya interpretado: con código para decidir y con mensaje para pintar. */
export interface DomainError {
  code: ErrorCode | string
  message: string
  /** El `status` HTTP cuando lo hubo. Ausente en un fallo de red, que no trae respuesta. */
  status?: number
}

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

export function ok<T>(data: T): ServiceResponse<T> {
  return { success: true, data, error: null }
}

export function fail<T>(error: DomainError): ServiceResponse<T> {
  return { success: false, data: null, error }
}

export function domainError(code: ErrorCode | string, message: string, status?: number): DomainError {
  return status === undefined ? { code, message } : { code, message, status }
}

/**
 * Envelope de todos los listados del API (ADR-009). Vive en `shared` porque lo devuelve todo
 * endpoint de índice, sea de la feature que sea.
 */
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  pageNumber: number
  pageSize: number
}

/** Cuerpo de error uniforme del API. */
export interface ApiErrorBody {
  status: number
  error: string
  message: string
  path: string
}

import { ErrorCodes, type DomainError } from '@shared/types/api.types'

/** Un fallo del guardado, ya atribuido a un campo cuando se puede. */
export interface LocationSubmitError {
  field: 'name' | 'code' | 'parent' | null
  message: string
}

/**
 * Atribuye un fallo del API a su campo. El `409` es de **dos** causas —el código repetido y el
 * ciclo de la jerarquía— y el API las distingue por el mensaje, que es lo que escribe quien conoce
 * la regla. Un padre inexistente es un `400` sobre el padre.
 */
export function locationSubmitError(error: DomainError): LocationSubmitError {
  const message = error.message
  if (error.code === ErrorCodes.CONFLICT) {
    if (/c[óo]digo/i.test(message)) return { field: 'code', message }
    if (/contener|descend|ciclo|s[ií] misma|hija/i.test(message)) return { field: 'parent', message }
    return { field: null, message }
  }
  if (error.code === ErrorCodes.VALIDATION_ERROR) {
    if (/c[óo]digo/i.test(message)) return { field: 'code', message }
    if (/nombre/i.test(message)) return { field: 'name', message }
    if (/padre|parent|no existe/i.test(message)) return { field: 'parent', message }
  }
  return { field: null, message }
}

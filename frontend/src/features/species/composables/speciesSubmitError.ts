import { ErrorCodes, type DomainError } from '@shared/types/api.types'

/** Un fallo del guardado, ya atribuido a un campo cuando se puede. */
export interface SpeciesSubmitError {
  field: 'scientificName' | 'code' | null
  message: string
}

/**
 * Atribuye un fallo del API a su campo. El `409` es de **dos** campos posibles —el nombre científico
 * y el código, ambos únicos, y el código además bloqueado cuando la especie tiene ejemplares—, y el
 * API los distingue por el mensaje, que es lo que escribe quien conoce la regla.
 */
export function speciesSubmitError(error: DomainError): SpeciesSubmitError {
  if (error.code === ErrorCodes.CONFLICT) {
    return { field: /c[óo]digo/i.test(error.message) ? 'code' : 'scientificName', message: error.message }
  }
  if (error.code === ErrorCodes.VALIDATION_ERROR && /c[óo]digo/i.test(error.message)) {
    return { field: 'code', message: error.message }
  }
  return { field: null, message: error.message }
}

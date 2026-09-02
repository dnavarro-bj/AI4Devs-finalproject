import type { CareRecord } from '../types/api'

/** Los cinco valores de una lectura. Todos opcionales por separado: basta con uno. */
export interface CareRecordInput {
  humidity?: number
  temperature?: number
  lightHours?: number
  waterAmountMl?: number
  soilPh?: number
}

/**
 * Registro de lecturas de cultivo.
 *
 * No se envía `recordedAt`: la fecha la sella el servidor cuando falta. Y los valores no
 * informados **se omiten** en lugar de mandarse a cero — un cero es una medida, no una ausencia.
 */
export function useCareRecords() {
  const api = useApi()

  function create(plantId: string, input: CareRecordInput): Promise<CareRecord> {
    const body: Record<string, number> = {}
    for (const [field, value] of Object.entries(input)) {
      if (value !== undefined) body[field] = value
    }
    return api.post<CareRecord>(`/plants/${plantId}/care-records`, body)
  }

  return { create }
}

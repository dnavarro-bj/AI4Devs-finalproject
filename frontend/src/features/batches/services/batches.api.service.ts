import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type ServiceResponse } from '@shared/types/api.types'
import type { BatchAction, BatchRequest, BatchResult, BatchScope } from '../types/batch.types'

/** El nombre del objeto del cuerpo que corresponde a cada acción. */
const ACTION_FIELD = { reading: 'reading', intervention: 'intervention', comment: 'comment' } as const

const actionPayload = (action: BatchAction) =>
  action.kind === 'reading' ? action.reading : action.kind === 'intervention' ? action.intervention : action.comment

/**
 * El API del trabajo por lote. Habla con el backend y nada más: sin `loading`, sin DOM y sin lanzar
 * nunca (ADR-015). Un alcance mayor que el máximo del servidor llega como un error con su mensaje,
 * que la pantalla muestra tal cual: el frontend no conoce el máximo.
 */
export const batchesApiService = {
  /** Cuántas plantas afectaría un lote con ese alcance, **sin escribir nada**. */
  async preview(scope: BatchScope, excludedPlantIds: string[]): Promise<ServiceResponse<number>> {
    try {
      const body: Record<string, unknown> = { scope }
      if (excludedPlantIds.length && scope.kind !== 'query') body.excludedPlantIds = excludedPlantIds
      const response = await getApiClient().post<{ count: number }>('/batches/preview', body)
      return ok(response.count)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async apply(request: BatchRequest): Promise<ServiceResponse<BatchResult>> {
    try {
      const body: Record<string, unknown> = { scope: request.scope }
      // Las exclusiones solo valen con un alcance de lista o de localización: una consulta no las admite.
      if (request.excludedPlantIds?.length && request.scope.kind !== 'query') body.excludedPlantIds = request.excludedPlantIds
      if (request.occurredAt) body.occurredAt = request.occurredAt
      // El API no tiene un campo `action`: lleva **exactamente uno** de los tres objetos, y cuál es lo dice su nombre.
      body[ACTION_FIELD[request.action.kind]] = actionPayload(request.action)
      return ok(await getApiClient().post<BatchResult>('/batches', body))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

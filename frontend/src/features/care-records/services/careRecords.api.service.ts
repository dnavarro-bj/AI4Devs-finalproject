import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { CareRecord, CareRecordInput } from '../types/careRecord.types'

/**
 * Las lecturas de cultivo de una planta.
 *
 * En el alta no se envía `recordedAt`: la fecha la sella el servidor cuando falta. Y los valores
 * no informados **se omiten** en lugar de mandarse a cero — un cero es una medida, no una
 * ausencia.
 */
export const careRecordsApiService = {
  async list(plantId: string, page = 0): Promise<ServiceResponse<PageResponse<CareRecord>>> {
    try {
      return ok(await getApiClient().get<PageResponse<CareRecord>>(`/plants/${plantId}/care-records`, { page }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(plantId: string, input: CareRecordInput): Promise<ServiceResponse<CareRecord>> {
    const body: Record<string, number> = {}
    for (const [field, value] of Object.entries(input)) {
      if (value !== undefined) body[field] = value
    }

    try {
      return ok(await getApiClient().post<CareRecord>(`/plants/${plantId}/care-records`, body))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

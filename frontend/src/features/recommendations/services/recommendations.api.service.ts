import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type ServiceResponse } from '@shared/types/api.types'
import type { Recommendation } from '../types/recommendation.types'

/**
 * El análisis de IA de una lectura.
 *
 * `POST` genera y persiste; es idempotente en el servidor —si ya existe la devuelve con `200` sin
 * volver a consultar al proveedor—. `GET` solo consulta y devuelve `404` si aún no hay, que **no
 * es un error de la pantalla**: usa `isNotFound` para distinguirlo.
 */
export const recommendationsApiService = {
  async generate(plantId: string, careRecordId: string): Promise<ServiceResponse<Recommendation>> {
    try {
      return ok(await getApiClient().post<Recommendation>(
        `/plants/${plantId}/care-records/${careRecordId}/recommendation`,
      ))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async fetchExisting(plantId: string, careRecordId: string): Promise<ServiceResponse<Recommendation>> {
    try {
      return ok(await getApiClient().get<Recommendation>(
        `/plants/${plantId}/care-records/${careRecordId}/recommendation`,
      ))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

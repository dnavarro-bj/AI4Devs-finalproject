import { ok, type ServiceResponse } from '@shared/types/api.types'
import { ALERTS_MOCK, USE_MOCK_ALERTS } from '../mocks/alerts.mock'
import type { Alert } from '../types/alert.types'

/**
 * Las alertas.
 *
 * El API no tiene alertas todavía (T-23), así que el service resuelve contra datos de ejemplo tras
 * su bandera (ADR-015): conectarlas será sustituir el cuerpo de esta función y borrar `mocks/`.
 */
export const alertsApiService = {
  async list(): Promise<ServiceResponse<Alert[]>> {
    return ok(USE_MOCK_ALERTS ? ALERTS_MOCK.map((alert) => ({ ...alert })) : [])
  },
}

import type { Recommendation } from '../types/api'

/**
 * El análisis de IA de una lectura.
 *
 * `POST` genera y persiste; es idempotente en el servidor —si ya existe la devuelve con `200` sin
 * volver a consultar al proveedor—. `GET` solo consulta y devuelve `404` si aún no hay.
 */
export function useRecommendation() {
  const api = useApi()

  const generate = (plantId: string, careRecordId: string) =>
    api.post<Recommendation>(`/plants/${plantId}/care-records/${careRecordId}/recommendation`)

  const fetchExisting = (plantId: string, careRecordId: string) =>
    api.get<Recommendation>(`/plants/${plantId}/care-records/${careRecordId}/recommendation`)

  return { generate, fetchExisting }
}

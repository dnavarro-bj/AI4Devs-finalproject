import { ok, type ServiceResponse } from '@shared/types/api.types'
import { searchFixture, USE_MOCK_SEARCH } from '../mocks/search.mock'
import { KIND_LABELS, KIND_ORDER, type SearchGroup, type SearchResult } from '../types/search.types'

/**
 * La búsqueda global.
 *
 * El API no tiene endpoint de búsqueda por texto todavía (T-21), así que el service resuelve
 * contra datos de ejemplo tras su bandera. Es aquí y no en el composable ni en el componente
 * donde entra el mock (ADR-015): conectar la búsqueda real será sustituir el cuerpo de esta
 * función y borrar `mocks/`, sin tocar pantalla ni composable.
 */
export const searchApiService = {
  async search(query: string): Promise<ServiceResponse<SearchGroup[]>> {
    const results: SearchResult[] = USE_MOCK_SEARCH ? searchFixture(query) : []
    return ok(group(results))
  },
}

/** Agrupados por tipo y en orden fijo; los grupos vacíos no se muestran. */
function group(results: SearchResult[]): SearchGroup[] {
  return KIND_ORDER
    .map((kind) => ({
      kind,
      label: KIND_LABELS[kind],
      results: results.filter((result) => result.kind === kind),
    }))
    .filter((entry) => entry.results.length > 0)
}

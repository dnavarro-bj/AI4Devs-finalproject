import { ok, type ServiceResponse } from '@shared/types/api.types'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { speciesApiService } from '@features/species/services/species.api.service'
import { searchFixture, USE_MOCK_SEARCH } from '../mocks/search.mock'
import { KIND_LABELS, KIND_ORDER, type SearchGroup, type SearchResult } from '../types/search.types'

/** Es un desplegable, no un listado: unos pocos resultados por tipo bastan para llegar a uno. */
const RESULTS_PER_KIND = 5

/**
 * La búsqueda global.
 *
 * **Plantas y especies salen del API, por código de inventario**: dos listados filtrados, pedidos en
 * paralelo. Localizaciones y etiquetas siguen saliendo de datos de ejemplo —marcados— hasta que el
 * API las busque (T-21); ese endpoint único reducirá las dos peticiones a una sin cambiar la forma
 * de lo que consume el diálogo.
 *
 * **Cada tipo falla por separado.** Si el API de plantas cae, las especies se siguen mostrando: la
 * búsqueda no es todo o nada. Un service nunca lanza (ADR-015), y este tampoco devuelve un error
 * por un tipo caído: degradar a «sin resultados de ese tipo» es lo que el usuario puede usar.
 */
export const searchApiService = {
  async search(query: string): Promise<ServiceResponse<SearchGroup[]>> {
    const text = query.trim()
    if (!text) return ok([])

    const [plants, species] = await Promise.all([
      plantsApiService.list({ code: text }),
      speciesApiService.list(0, undefined, text),
    ])

    const results: SearchResult[] = [
      ...(plants.success
        ? plants.data!.content.slice(0, RESULTS_PER_KIND).map((plant): SearchResult => ({
            kind: 'plant',
            label: plant.code,
            detail: `${plant.nickname} · ${plant.location.name}`,
            to: `/plants/${plant.id}`,
          }))
        : []),
      ...(species.success
        ? species.data!.content.slice(0, RESULTS_PER_KIND).map((item): SearchResult => ({
            kind: 'species',
            label: item.code,
            detail: `${item.scientificName} · ${item.commonName}`,
            to: `/species/${item.id}`,
          }))
        : []),
      ...(USE_MOCK_SEARCH ? searchFixture(text) : []),
    ]

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

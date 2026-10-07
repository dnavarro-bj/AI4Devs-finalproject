import { ok, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { speciesApiService } from '@features/species/services/species.api.service'
import { locationsApiService } from '@features/locations/services/locations.api.service'
import { catalogsApiService } from '@features/catalogs/services/catalogs.api.service'
import { KIND_LABELS, KIND_ORDER, type SearchGroup, type SearchResult, type SearchResultKind } from '../types/search.types'

/** Es un desplegable, no un listado: unos pocos resultados por tipo bastan para llegar a uno. */
const RESULTS_PER_KIND = 5

/** Los tipos cuya pantalla de listado filtra por `?q=`: solo ellos pueden ofrecer «Ver todos». */
const LIST_SCREENS: Partial<Record<SearchResultKind, string>> = {
  plant: '/plants',
  species: '/species',
}

/**
 * La búsqueda global.
 *
 * **Cuatro consultas en paralelo, una por tipo, todas con `q`** (ADR-016): plantas por código, apodo
 * y especie; especies por código y nombres; localizaciones por nombre y código; etiquetas por
 * nombre. No hay endpoint unificado ni dato de ejemplo: lo que sale es lo que el API devuelve.
 *
 * **Cada tipo falla por separado.** Si el API de etiquetas cae, las plantas se siguen mostrando: la
 * búsqueda no es todo o nada. Un service nunca lanza (ADR-015), y este tampoco devuelve un error
 * por un tipo caído: degradar a «sin resultados de ese tipo» es lo que el usuario puede usar.
 */
export const searchApiService = {
  async search(query: string): Promise<ServiceResponse<SearchGroup[]>> {
    const text = query.trim()
    if (!text) return ok([])

    const size = RESULTS_PER_KIND
    const [plants, species, locations, tags] = await Promise.all([
      plantsApiService.list({ q: text, size }),
      speciesApiService.search({ q: text, size }),
      locationsApiService.list({ q: text, size }),
      catalogsApiService.searchTags({ q: text, size }),
    ])

    const found: { kind: SearchResultKind, total: number, results: SearchResult[] }[] = [
      ...(plants.success ? [entry('plant', plants.data!, (plant): SearchResult => ({
        kind: 'plant',
        label: plant.code,
        detail: `${plant.nickname} · ${plant.location.name}`,
        to: `/plants/${plant.id}`,
      }))] : []),
      ...(species.success ? [entry('species', species.data!, (item): SearchResult => ({
        kind: 'species',
        label: item.code,
        detail: `${item.scientificName} · ${item.commonName}`,
        to: `/species/${item.id}`,
      }))] : []),
      ...(locations.success ? [entry('location', locations.data!, (location): SearchResult => ({
        kind: 'location',
        label: location.name,
        detail: `${location.code} · ${location.plantCount} plantas`,
        to: `/locations/${location.id}`,
      }))] : []),
      ...(tags.success ? [entry('tag', tags.data!, (tag): SearchResult => ({
        kind: 'tag',
        label: tag.name,
        detail: `${tag.plantCount} plantas`,
        to: `/tags/${tag.id}`,
      }))] : []),
    ]

    return ok(group(found, text))
  },
}

function entry<T>(kind: SearchResultKind, page: PageResponse<T>, toResult: (item: T) => SearchResult) {
  return {
    kind,
    total: page.totalElements,
    results: page.content.slice(0, RESULTS_PER_KIND).map(toResult),
  }
}

/** Agrupados por tipo y en orden fijo; los grupos vacíos no se muestran. */
function group(found: { kind: SearchResultKind, total: number, results: SearchResult[] }[], text: string): SearchGroup[] {
  return KIND_ORDER
    .map((kind) => found.find((item) => item.kind === kind))
    .filter((item): item is NonNullable<typeof item> => item !== undefined && item.results.length > 0)
    .map(({ kind, total, results }): SearchGroup => {
      const screen = LIST_SCREENS[kind]
      return {
        kind,
        label: KIND_LABELS[kind],
        results,
        // Solo si hay más de las que caben y la pantalla del tipo filtra por texto.
        ...(screen && total > results.length
          ? { more: { label: `Ver los ${total} resultados`, to: `${screen}?q=${encodeURIComponent(text)}` } }
          : {}),
      }
    })
}

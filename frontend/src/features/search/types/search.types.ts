/** El modelo de la búsqueda global. */

export type SearchResultKind = 'plant' | 'species' | 'location' | 'tag'

export interface SearchResult {
  kind: SearchResultKind
  /** Lo que identifica al elemento: el código de un ejemplar, el nombre de una especie. */
  label: string
  /** Contexto que lo desambigua cuando dos resultados se llaman parecido. */
  detail?: string
  to: string
}

/** Lo que consume `UiGlobalSearch`: los resultados ya repartidos por tipo. */
export interface SearchGroup {
  kind: SearchResultKind
  label: string
  results: SearchResult[]
}

export const KIND_LABELS: Record<SearchResultKind, string> = {
  plant: 'Plantas',
  species: 'Especies',
  location: 'Localizaciones',
  tag: 'Etiquetas',
}

/** El orden en que se presentan los grupos: de lo más concreto a lo más transversal. */
export const KIND_ORDER: SearchResultKind[] = ['plant', 'species', 'location', 'tag']

/**
 * DATOS DE EJEMPLO — LOS REEMPLAZA T-21 BORRANDO ESTE FICHERO ENTERO.
 *
 * Las **plantas y las especies ya se buscan en el API, por código** (`busqueda-por-codigo`). Lo que
 * sigue siendo ejemplo son las localizaciones y las etiquetas: el API no las busca por texto
 * todavía —ni tienen código por el que buscar—, y su búsqueda llega con T-21.
 *
 * Cada resultado de aquí **se marca como ejemplo en el propio resultado**. Mezclar resultados
 * reales con otros inventados sin decirlo es peor que una búsqueda que dice cuáles son cuáles.
 *
 * Vive aparte y no dentro del layout a propósito: T-21 tiene que poder borrar el fichero y saber
 * que no se deja nada. Nadie más debe importarlo: solo el service de `search`.
 */

import type { SearchResult } from '../types/search.types'

/** Mientras el API no busque localizaciones ni etiquetas, el service las resuelve contra estos datos (ADR-015). */
export const USE_MOCK_SEARCH = true

const CATALOGUE: SearchResult[] = [
  { kind: 'location', label: 'Invernadero 1', detail: '312 plantas', to: '/locations' },
  { kind: 'location', label: 'Bandeja A3', detail: '24 plantas', to: '/locations' },
  { kind: 'tag', label: 'globular', detail: '87 plantas', to: '/tags' },
  { kind: 'tag', label: 'sin espinas', detail: '12 plantas', to: '/tags' },
]

/** Lo que se añade al detalle de cada resultado de ejemplo para que no se confunda con uno real. */
export const EXAMPLE_MARK = 'ejemplo'

/**
 * Búsqueda por coincidencia parcial, sin distinguir mayúsculas ni acentos. La versión real la
 * resolverá el API; esta solo tiene que ser suficiente para ejercitar el componente.
 */
export function searchFixture(query: string): SearchResult[] {
  const needle = normalize(query.trim())
  if (!needle) return []

  return CATALOGUE
    .filter((result) => normalize(`${result.label} ${result.detail ?? ''}`).includes(needle))
    .map((result) => ({ ...result, detail: [result.detail, EXAMPLE_MARK].filter(Boolean).join(' · ') }))
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

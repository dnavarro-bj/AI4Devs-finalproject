/**
 * DATOS DE EJEMPLO — LOS REEMPLAZA T-21 BORRANDO ESTE FICHERO ENTERO.
 *
 * El buscador global existe desde T-10, pero el API no tiene todavía endpoint de búsqueda por
 * texto: T-02 y T-08 exponen listados filtrables, no búsqueda. Estos datos permiten cerrar el
 * contrato del componente —agrupación por tipo, recorrido con teclado, estado sin resultados—
 * sin esperar al backend.
 *
 * Vive aparte y no dentro del layout a propósito: T-21 tiene que poder borrar el fichero y saber
 * que no se deja nada. Datos falsos mezclados con lógica real son los que sobreviven a la
 * conexión y acaban en producción.
 *
 * Nadie más debe importarlo: solo el service de `search`.
 */

import type { SearchResult } from '../types/search.types'

/** Mientras no exista endpoint de búsqueda, el service resuelve contra estos datos (ADR-015). */
export const USE_MOCK_SEARCH = true

const CATALOGUE: SearchResult[] = [
  { kind: 'plant', label: 'CAT-GRUSS-01', detail: 'Bola verde · Bandeja A3', to: '/plants' },
  { kind: 'plant', label: 'CAT-GRUSS-02', detail: 'Erizo · Bandeja A3', to: '/plants' },
  { kind: 'plant', label: 'MAM-ELON-07', detail: 'Dedal · Invernadero 1', to: '/plants' },
  { kind: 'species', label: 'Echinocactus grusonii', detail: 'Asiento de suegra', to: '/species' },
  { kind: 'species', label: 'Mammillaria elongata', detail: 'Cactus dedal', to: '/species' },
  { kind: 'location', label: 'Invernadero 1', detail: '312 plantas', to: '/locations' },
  { kind: 'location', label: 'Bandeja A3', detail: '24 plantas', to: '/locations' },
  { kind: 'tag', label: 'globular', detail: '87 plantas', to: '/tags' },
  { kind: 'tag', label: 'sin espinas', detail: '12 plantas', to: '/tags' },
]

/**
 * Búsqueda por coincidencia parcial, sin distinguir mayúsculas ni acentos. La versión real la
 * resolverá el API; esta solo tiene que ser suficiente para ejercitar el componente.
 */
export function searchFixture(query: string): SearchResult[] {
  const needle = normalize(query.trim())
  if (!needle) return []

  return CATALOGUE.filter((result) =>
    normalize(`${result.label} ${result.detail ?? ''}`).includes(needle),
  )
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

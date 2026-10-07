/**
 * El estado de una pantalla de listado como *query string*: filtros, orden y columnas viven en la
 * URL, de modo que recargar o compartir el enlace reproduce la pantalla (y una vista guardada es,
 * sencillamente, esa cadena).
 *
 * Son funciones puras: el esquema dice qué parámetros existen y de qué tipo, y todo lo que la URL
 * traiga fuera de él —un parámetro desconocido, un valor que no es de los admitidos— se **ignora**
 * en lugar de romper la pantalla. Una URL escrita a mano o vieja no puede tumbar el inventario.
 */

/** Un parámetro: texto libre, uno de unos valores, una lista (repetible) o una marca. */
export type UrlParam =
  | { kind: 'text' }
  | { kind: 'enum', values: readonly string[] }
  | { kind: 'list', values?: readonly string[] }
  | { kind: 'flag' }

export type UrlSchema = Record<string, UrlParam>

export type UrlState<S extends UrlSchema> = {
  [K in keyof S]: S[K] extends { kind: 'list' } ? string[] : S[K] extends { kind: 'flag' } ? boolean : string
}

/** Lo que `route.query` entrega: un valor, varios, o nada. */
export type RawQuery = Record<string, unknown>

function strings(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [raw]
  return list.filter((value): value is string => typeof value === 'string' && value !== '')
}

export function readUrlState<S extends UrlSchema>(schema: S, query: RawQuery): UrlState<S> {
  const state: Record<string, unknown> = {}
  for (const [key, param] of Object.entries(schema)) {
    const values = strings(query[key])
    switch (param.kind) {
      case 'text':
        state[key] = values[0] ?? ''
        break
      case 'enum':
        state[key] = values[0] !== undefined && param.values.includes(values[0]) ? values[0] : ''
        break
      case 'list':
        state[key] = [...new Set(values)].filter((value) => !param.values || param.values.includes(value))
        break
      case 'flag':
        state[key] = values[0] === 'true'
        break
    }
  }
  return state as UrlState<S>
}

/** La *query string* mínima del estado: lo que está en su valor por defecto no se escribe. */
export function toUrlQuery<S extends UrlSchema>(schema: S, state: UrlState<S>): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}
  for (const [key, param] of Object.entries(schema)) {
    const value = (state as Record<string, unknown>)[key]
    if (param.kind === 'list') {
      if ((value as string[]).length) query[key] = [...(value as string[])]
    } else if (param.kind === 'flag') {
      if (value) query[key] = 'true'
    } else if (value) {
      query[key] = value as string
    }
  }
  return query
}

/** Una cadena estable del estado, para comparar dos estados sin depender del orden de las claves. */
export function stateKey<S extends UrlSchema>(schema: S, state: UrlState<S>): string {
  return JSON.stringify(toUrlQuery(schema, state))
}

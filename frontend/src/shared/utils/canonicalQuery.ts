/**
 * La forma canónica de una consulta de listado: lo que se guarda en una vista y lo que se compara
 * para saber si la pantalla está en una vista guardada.
 *
 * Sin una forma única, `?a=1&b=2` y `?b=2&a=1` serían vistas distintas y el grupo seleccionado no
 * coincidiría nunca con la URL. La regla —pares ordenados por clave y, dentro de una clave, por
 * valor; `page`, `size` y los valores en blanco fuera; los repetidos reducidos a uno; `sort` conserva
 * el orden de sus valores, que es significativo, y no se reduce— está **implementada también en el backend**: los vectores
 * de `contracts/canonical-query.vectors.json` son lo que impide que diverjan.
 */

type Raw = string | string[] | null | undefined

/** Lo que `route.query` entrega, o un objeto equivalente. */
export type CanonicalInput = string | Record<string, Raw>

/** Los parámetros que no forman parte de una vista: la página que se está mirando no es el criterio. */
const EXCLUDED = new Set(['page', 'size'])

/** `sort` conserva el orden de sus valores: el primero manda y el segundo desempata. */
const ORDERED = new Set(['sort'])

/**
 * Todo lo que no es un carácter no reservado se codifica en %XX mayúsculas sobre UTF-8. La coma
 * se deja tal cual: es el separador de `sort=campo,dirección` y codificarla lo haría ilegible.
 */
const encode = (text: string) => encodeURIComponent(text)
  .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  .replace(/%2C/g, ',')

/** Un `+` entrante es un espacio, como en cualquier formulario. */
function decode(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    return text
  }
}

function parse(query: string): [string, string][] {
  const pairs: [string, string][] = []
  for (const part of query.replace(/^\?/, '').split('&')) {
    if (!part) continue
    const index = part.indexOf('=')
    const key = decode(index === -1 ? part : part.slice(0, index))
    const value = decode(index === -1 ? '' : part.slice(index + 1))
    pairs.push([key, value])
  }
  return pairs
}

function entries(input: CanonicalInput): [string, string][] {
  if (typeof input === 'string') return parse(input)
  return Object.entries(input).flatMap(([key, raw]) =>
    (Array.isArray(raw) ? raw : [raw]).flatMap((value): [string, string][] =>
      typeof value === 'string' ? [[key, value]] : []))
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function canonicalQuery(input: CanonicalInput): string {
  const grouped = new Map<string, string[]>()
  for (const [key, value] of entries(input)) {
    if (EXCLUDED.has(key) || key === '' || value.trim() === '') continue
    const values = grouped.get(key) ?? []
    // `sort` no se reduce: dos valores iguales siguen siendo dos criterios en su orden.
    if (ORDERED.has(key) || !values.includes(value)) values.push(value)
    grouped.set(key, values)
  }

  return [...grouped.keys()]
    .sort(byText)
    .flatMap((key) => {
      const values = grouped.get(key)!
      return (ORDERED.has(key) ? values : [...values].sort(byText))
        .map((value) => `${encode(key)}=${encode(value)}`)
    })
    .join('&')
}

/**
 * Lo contrario: los parámetros de una consulta, con sus valores, listos para escribirse en una
 * ruta. Aplica las mismas exclusiones que [canonicalQuery]: lo que no es de una vista no vuelve.
 */
export function parseQuery(input: CanonicalInput): Record<string, string[]> {
  const params: Record<string, string[]> = {}
  for (const [key, value] of entries(input)) {
    if (EXCLUDED.has(key) || key === '' || value.trim() === '') continue
    const values = params[key] ?? []
    if (ORDERED.has(key) || !values.includes(value)) values.push(value)
    params[key] = values
  }
  return params
}

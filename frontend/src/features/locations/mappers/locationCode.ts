/**
 * La propuesta de código que el formulario de localización hace mientras se escribe el nombre:
 * las iniciales del nombre, colgadas del código del padre cuando lo hay
 * (`Bancada norte` dentro de `LOC-I1` → `LOC-I1-BN`).
 *
 * Es **una comodidad del formulario, no una regla del sistema**: el servidor no genera nada, exige
 * el código y comprueba su unicidad. Por eso la propuesta no mira si ya existe —lo dice el `409`,
 * junto al campo— y el usuario puede escribir cualquier otro.
 */
const PREFIX = 'LOC-'
const SINGLE_WORD_LETTERS = 3

const plain = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

/** Un token con cifras se toma entero (`A3`, `1`); uno sin ellas aporta su inicial. */
function initialsOf(name: string): string {
  const tokens = plain(name).split(/[^A-Z0-9]+/).filter(Boolean)
  if (tokens.length === 1 && !/\d/.test(tokens[0]!)) return tokens[0]!.slice(0, SINGLE_WORD_LETTERS)
  return tokens.map((token) => (/\d/.test(token) ? token : token[0])).join('')
}

/** Vacío si el nombre no tiene nada con lo que componerlo. */
export function suggestLocationCode(name: string, parentCode?: string | null): string {
  const initials = initialsOf(name)
  if (!initials) return ''

  const base = parentCode?.trim()
  if (!base) return `${PREFIX}${initials}`
  const parentBody = base.toUpperCase().startsWith(PREFIX) ? base.slice(PREFIX.length) : base
  return `${PREFIX}${parentBody}-${initials}`
}

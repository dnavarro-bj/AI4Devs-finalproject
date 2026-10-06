/**
 * La propuesta de código que el formulario de especie hace mientras se escribe el nombre
 * científico: `CAT-` más las cinco primeras letras del género (`Echinocactus grusonii` → `CAT-ECHIN`).
 *
 * Es **una comodidad del formulario, no una regla del sistema**: el servidor no genera nada, exige
 * el código y valida su formato y su unicidad. Por eso la propuesta no comprueba si ya existe —eso
 * lo dice el `409`, junto al campo— y el usuario puede escribir otro cualquiera. Sin esta ayuda el
 * campo obligatorio obligaría a inventar un código para cada especie desde cero.
 *
 * El prefijo es el de la colección (`CAT`), el mismo que usan los códigos existentes; la pantalla de
 * configuración de códigos sigue siendo maqueta y no lo gobierna.
 */
const PREFIX = 'CAT'
const GENUS_LETTERS = 5

/** Sin diacríticos, solo letras y en mayúsculas: lo que el formato del código admite. */
const genusOf = (scientificName: string): string => {
  const firstWord = scientificName.trim().split(/\s+/)[0] ?? ''
  return firstWord
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, GENUS_LETTERS)
}

/** Vacío si el nombre no tiene ninguna letra con la que componerlo. */
export function suggestSpeciesCode(scientificName: string): string {
  // Un signo delante del género (un híbrido, `× Gasteraloe`) no cuenta como primera palabra.
  const cleaned = scientificName.replace(/^[^\p{L}]+/u, '')
  const genus = genusOf(cleaned)
  return genus ? `${PREFIX}-${genus}` : ''
}

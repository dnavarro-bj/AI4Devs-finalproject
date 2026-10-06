/**
 * La validación de los rangos de cuidado —humedad, temperatura y horas de luz—, que comparten el
 * formulario de especie y el editor de cuidados propios de un ejemplar.
 *
 * Es una **comprobación de rango**, que es lo que ADR-011 permite en el borde: evita un viaje para
 * algo que se sabe sin preguntar. No sustituye al dominio ni a la base de datos; si el servidor
 * rechaza, se pinta su mensaje.
 *
 * Los valores llegan como **texto** tal y como se teclean: un `input` vacío es cadena vacía, y
 * convertirlo a `0` demasiado pronto convertiría «no lo he rellenado» en «es cero», que para una
 * temperatura es un valor.
 */

export type CareConcept = 'humidity' | 'temperature' | 'light'

interface Scale {
  min: number
  max: number
  /** Cómo se nombra en el mensaje. */
  noun: string
  unit: string
}

/** Las escalas del API: humedad 0–100 y luz 0–24, y una temperatura plausible, como en las lecturas. */
export const SCALES: Record<CareConcept, Scale> = {
  humidity: { min: 0, max: 100, noun: 'La humedad', unit: '%' },
  temperature: { min: -50, max: 80, noun: 'La temperatura', unit: '°C' },
  light: { min: 0, max: 24, noun: 'Las horas de luz', unit: 'h' },
}

const NOUNS: Record<CareConcept, { low: string, high: string }> = {
  humidity: { low: 'La humedad mínima', high: 'la máxima' },
  temperature: { low: 'La temperatura mínima', high: 'la máxima' },
  light: { low: 'Las horas de luz mínimas', high: 'las máximas' },
}

const INTEGER = /^-?\d+$/

/**
 * `''` si el rango es válido; si no, el mensaje que explica **qué falla**. Un extremo vacío se ignora.
 *
 * `inherited` son los extremos de la especie: sobrescribir un solo extremo se juzga contra el otro que
 * **se aplicaría**, que si no está sobrescrito es el heredado. Si no se pasa, solo se comprueban los
 * extremos indicados entre sí.
 */
export function validateRange(
  concept: CareConcept,
  min: string,
  max: string,
  inherited?: { min: number, max: number },
): string {
  const scale = SCALES[concept]
  const own = { min: min.trim(), max: max.trim() }

  for (const value of [own.min, own.max]) {
    if (value === '') continue
    if (!INTEGER.test(value)) return `${scale.noun} debe ser un número entero.`
    const number = Number(value)
    if (number < scale.min || number > scale.max) {
      return concept === 'temperature'
        ? `${scale.noun} (${number} ${scale.unit}) no es plausible: debe estar entre ${scale.min} y ${scale.max} ${scale.unit}.`
        : `${scale.noun} debe estar entre ${scale.min} y ${scale.max}, y es ${number}.`
    }
  }

  // Sin ningún extremo propio no hay nada que juzgar, ni siquiera contra la especie.
  if (own.min === '' && own.max === '') return ''

  const low = own.min === '' ? inherited?.min : Number(own.min)
  const high = own.max === '' ? inherited?.max : Number(own.max)
  if (low === undefined || high === undefined) return ''

  return low > high
    ? `${NOUNS[concept].low} (${low}) no puede superar a ${NOUNS[concept].high} (${high}).`
    : ''
}

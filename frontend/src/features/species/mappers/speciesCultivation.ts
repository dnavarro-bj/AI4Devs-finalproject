/**
 * La ficha de cultivo de una especie y su calendario anual: los vocabularios con sus etiquetas, el
 * paso del calendario a la rejilla del año y la validación de los periodos en el borde.
 *
 * El mapper vive aquí porque la forma **cambia de verdad**: el API habla de periodos con inicio y
 * fin, la rejilla de doce niveles por pauta y el formulario de borradores de texto.
 */
import type { YearRow } from '@ui/UiYearGrid.vue'
import type {
  Environment,
  PeriodType,
  SpeciesDetail,
  SpeciesInput,
  SpeciesPeriod,
  SpeciesPeriodInput,
  SunExposure,
  WateringIntensity,
} from '../types/species.types'

/**
 * **Sin umbrales.** La definición funcional de cada valor es lo que distingue «soleado» de «pleno
 * sol»: la exposición describe cómo llega la luz y las horas de luz cuánta, y ninguna se deduce de
 * la otra.
 */
export const SUN_EXPOSURE: { value: SunExposure, label: string, description: string, mark: string }[] = [
  { value: 'sombra', label: 'Sombra', description: 'Luz indirecta; evita el sol directo', mark: '◑' },
  { value: 'semisombra', label: 'Semisombra', description: 'Sol directo limitado o filtrado', mark: '◐' },
  { value: 'soleado', label: 'Soleado', description: 'Varias horas de sol directo', mark: '◒' },
  { value: 'pleno_sol', label: 'Pleno sol', description: 'Exposición directa prolongada', mark: '☼' },
]

/** Tres valores: la estacionalidad la dicen los periodos, no un cuarto valor. */
export const ENVIRONMENTS: { value: Environment, label: string }[] = [
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'ambos', label: 'Ambos' },
]

export const INTENSITIES: { value: WateringIntensity, label: string, level: number }[] = [
  { value: 'escaso', label: 'Escaso', level: 1 },
  { value: 'moderado', label: 'Moderado', level: 2 },
  { value: 'abundante', label: 'Abundante', level: 3 },
]

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const sunExposureLabel = (value: SunExposure | null | undefined) =>
  SUN_EXPOSURE.find((option) => option.value === value)?.label ?? null

export const environmentLabel = (value: Environment | null | undefined) =>
  ENVIRONMENTS.find((option) => option.value === value)?.label ?? null

/** Los meses (1–12) que cubre un periodo. Con inicio > fin recorre diciembre: 11→2 son nov, dic, ene, feb. */
export function monthsOf(start: number, end: number): number[] {
  if (start <= end) return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  return [
    ...Array.from({ length: 12 - start + 1 }, (_, index) => start + index),
    ...Array.from({ length: end }, (_, index) => index + 1),
  ]
}

/** «Mayo–julio»; un solo mes, «Junio»; cruzando el año, «Noviembre–febrero». */
export function periodSpan(start: number, end: number): string {
  const first = MONTH_NAMES[start - 1]!
  const label = start === end ? first : `${first}–${MONTH_NAMES[end - 1]}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Las cuatro pautas de la rejilla. `max` es cuántas fuerzas distintas admite cada una. */
export type CalendarRowId = 'crecimiento' | 'reposo' | 'floracion' | 'riego'

const ROWS: { id: CalendarRowId, label: string, tone: NonNullable<YearRow['tone']>, max: number }[] = [
  { id: 'crecimiento', label: 'Crecimiento', tone: 'brand', max: 2 },
  { id: 'reposo', label: 'Reposo', tone: 'neutral', max: 1 },
  { id: 'floracion', label: 'Floración', tone: 'warning', max: 1 },
  { id: 'riego', label: 'Riego', tone: 'info', max: 3 },
]

export const YEAR_LEGEND: { tone: NonNullable<YearRow['tone']>, label: string }[] = [
  { tone: 'brand', label: 'Crecimiento · más intenso, el de mayor crecimiento' },
  { tone: 'neutral', label: 'Reposo' },
  { tone: 'warning', label: 'Floración habitual' },
  { tone: 'info', label: 'Riego · más intenso, más abundante' },
]

/** Un nivel por mes (doce) y por pauta: `0` apagado; en el crecimiento `2` es el máximo; en el riego, la intensidad. */
export type CalendarLevels = Record<CalendarRowId, number[]>

export const emptyLevels = (): CalendarLevels => ({
  crecimiento: Array<number>(12).fill(0),
  reposo: Array<number>(12).fill(0),
  floracion: Array<number>(12).fill(0),
  riego: Array<number>(12).fill(0),
})

type PeriodLike = Pick<SpeciesPeriodInput, 'type' | 'startMonth' | 'endMonth' | 'intensity'>

/**
 * El calendario como doce niveles por pauta. **Crecimiento máximo se superpone** al crecimiento: un
 * mes con ambos vale `2`, uno solo de crecimiento `1`. El riego lleva su intensidad.
 */
export function periodsToLevels(periods: PeriodLike[] | undefined): CalendarLevels {
  const levels = emptyLevels()
  for (const period of periods ?? []) {
    for (const month of monthsOf(period.startMonth, period.endMonth)) {
      const index = month - 1
      if (period.type === 'crecimiento') levels.crecimiento[index] = Math.max(levels.crecimiento[index]!, 1)
      else if (period.type === 'crecimiento_maximo') levels.crecimiento[index] = 2
      else if (period.type === 'riego') {
        levels.riego[index] = INTENSITIES.find((intensity) => intensity.value === period.intensity)?.level ?? 1
      } else levels[period.type][index] = 1
    }
  }
  return levels
}

/**
 * Los tramos **consecutivos** de meses activos, de 1 a 12. El año es un ciclo: si diciembre y enero
 * están activos son **un** tramo que cruza el fin de año (11→2), no dos; y con los doce meses, uno
 * solo de 1 a 12.
 */
function runs(active: boolean[]): [start: number, end: number][] {
  if (active.every(Boolean)) return [[1, 12]]
  const result: [number, number][] = []
  for (let start = 0; start < 12; start++) {
    if (!active[start] || active[(start + 11) % 12]) continue
    let end = start
    while (active[(end + 1) % 12]) end = (end + 1) % 12
    result.push([start + 1, end + 1])
  }
  return result
}

/**
 * Lo marcado en la rejilla como periodos para el API. Cada mes tiene **un** nivel por pauta, así que
 * el solape dentro de un tipo es imposible por construcción, y el crecimiento máximo cae siempre
 * dentro del crecimiento: marcar «más» un mes lo deja en los dos.
 */
export function levelsToPeriods(levels: CalendarLevels): SpeciesPeriodInput[] {
  const make = (type: PeriodType, [startMonth, endMonth]: [number, number], intensity: WateringIntensity | null = null): SpeciesPeriodInput =>
    ({ type, startMonth, endMonth, intensity, notes: null })

  return [
    ...runs(levels.crecimiento.map((level) => level >= 1)).map((span) => make('crecimiento', span)),
    ...runs(levels.crecimiento.map((level) => level >= 2)).map((span) => make('crecimiento_maximo', span)),
    ...runs(levels.reposo.map((level) => level >= 1)).map((span) => make('reposo', span)),
    ...runs(levels.floracion.map((level) => level >= 1)).map((span) => make('floracion', span)),
    ...INTENSITIES.flatMap((intensity) =>
      runs(levels.riego.map((level) => level === intensity.level)).map((span) => make('riego', span, intensity.value))),
  ]
}

/** Las filas de la rejilla para unos niveles. **Siempre las cuatro**, también sin actividad. */
export function levelRows(levels: CalendarLevels): YearRow[] {
  return ROWS.map(({ id, label, tone, max }) => ({ id, label, tone, max, levels: levels[id] }))
}

export const yearRows = (periods: PeriodLike[] | undefined): YearRow[] => levelRows(periodsToLevels(periods))

/**
 * La especie en forma de cuerpo de la corrección. **El `PUT` es reemplazo completo**: omitir un
 * campo lo borraría, así que la corrección parte de todo lo guardado, calendario incluido.
 */
export function speciesToInput(species: SpeciesDetail): SpeciesInput {
  return {
    code: species.code,
    scientificName: species.scientificName,
    commonName: species.commonName,
    minHumidity: species.minHumidity,
    maxHumidity: species.maxHumidity,
    minTemperature: species.minTemperature,
    maxTemperature: species.maxTemperature,
    minLightHours: species.minLightHours,
    maxLightHours: species.maxLightHours,
    wateringGuideline: species.wateringGuideline,
    soilMixId: species.soilMix.id,
    description: species.description,
    sunExposure: species.sunExposure,
    environment: species.environment,
    bloomDescription: species.bloomDescription,
    bloomColor: species.bloomColor,
    bloomMaturity: species.bloomMaturity,
    bloomTypicalDuration: species.bloomTypicalDuration,
    periods: (species.periods ?? []).map(({ id: _id, ...period }) => period),
  }
}

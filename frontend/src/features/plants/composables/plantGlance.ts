import type { SummaryItem } from '@ui/UiSummaryGrid.vue'
import type { CareRecord } from '@features/care-records/types/careRecord.types'
import { MOCK_NEXT_TASK } from '../mocks/plantDetail.mock'
import { bloomDays, bloomMonth } from '@features/timeline/mappers/timeline.mapper'
import type { Bloom } from '@features/timeline/types/timeline.types'

/**
 * El resumen «de un vistazo» de la ficha: las cuatro magnitudes del wireframe.
 *
 * Función pura, aparte del componente: es la lógica, y no debería necesitar el DOM para probarse.
 *
 * **`now` entra por parámetro**, como en la agenda y como el `Clock` único del backend (ADR-010).
 * «Hace 18 días» es una comparación, no un hecho del universo, y un componente que consultara el
 * reloj no se podría testear sin congelar el tiempo.
 *
 * El riego, la medición y la última floración salen de datos **reales**; solo la tarea es maqueta
 * hasta T-22, y va marcada como tal. `lastBloom` es `undefined` mientras no se ha consultado y
 * `null` cuando el ejemplar nunca ha florecido: no son lo mismo.
 */

const MEASURES: { key: keyof CareRecord, unit: string }[] = [
  { key: 'temperature', unit: '°C' },
  { key: 'humidity', unit: '%' },
  { key: 'lightHours', unit: 'h' },
  { key: 'soilPh', unit: 'pH' },
]

export function plantGlance(records: CareRecord[], now: string, lastBloom?: Bloom | null): SummaryItem[] {
  // El API sirve las lecturas en orden descendente, así que la primera que cumpla es la última.
  const lastWatering = records.find((record) => record.waterAmountMl != null)
  const lastMeasured = records.find((record) => MEASURES.some((measure) => record[measure.key] != null))

  return [
    {
      label: 'Último riego',
      value: lastWatering
        ? `${shortDate(lastWatering.recordedAt)} · ${lastWatering.waterAmountMl} ml`
        : '—',
      note: lastWatering ? sinceLabel(lastWatering.recordedAt, now) : 'Sin riegos registrados',
    },
    {
      label: 'Próxima tarea',
      value: MOCK_NEXT_TASK.value,
      note: MOCK_NEXT_TASK.context,
      mock: true,
    },
    {
      label: 'Última medición',
      value: lastMeasured ? measuresOf(lastMeasured) : '—',
      note: lastMeasured ? shortDate(lastMeasured.recordedAt) : 'Sin lecturas registradas',
    },
    bloomItem(lastBloom),
  ]
}

/** Las magnitudes informadas, en una sola línea comparable: «24 °C · 31 %». */
function measuresOf(record: CareRecord): string {
  return MEASURES
    .filter((measure) => record[measure.key] != null)
    .map((measure) => `${String(record[measure.key]).replace('.', ',')} ${measure.unit}`)
    .join(' · ')
}

function shortDate(at: string): string {
  return new Date(at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** «Hoy», «Ayer» o «Hace N días»: el cero y el uno leídos como los diría una persona. */
function sinceLabel(at: string, now: string): string {
  const days = Math.floor((dayOf(now) - dayOf(at)) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

/** Comparar días, no instantes: dos horas de diferencia no son «hace un día». */
function dayOf(at: string): number {
  return Date.parse(`${at.slice(0, 10)}T00:00:00Z`)
}

/** La floración **observada** más reciente: su mes y cuánto duró, o que sigue en curso. */
function bloomItem(bloom: Bloom | null | undefined): SummaryItem {
  if (bloom === undefined) return { label: 'Última floración', value: '—', note: 'Sin consultar' }
  if (bloom === null) return { label: 'Última floración', value: '—', note: 'Sin floraciones registradas' }
  const days = bloomDays(bloom)
  return {
    label: 'Última floración',
    value: bloomMonth(bloom),
    note: days === null ? 'En curso' : `Duró ${days === 1 ? '1 día' : `${days} días`}`,
  }
}

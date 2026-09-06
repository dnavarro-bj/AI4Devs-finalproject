import { ref } from 'vue'
import type { DomainError } from '@shared/types/api.types'
import { careRecordsApiService } from '../services/careRecords.api.service'
import type { CareRecord } from '../types/careRecord.types'

/**
 * El historial de lecturas de una planta, listo para la cronología.
 *
 * `GET /plants/{id}/care-records` existe desde T-03 y **nadie lo consumía**: la ficha mostraba la
 * lectura que acabas de registrar y ninguna anterior, así que la historia 0.5 estaba sin cumplir
 * pese a tener su API en verde.
 *
 * Comprobado contra el backend: el endpoint devuelve el envelope paginado, **omite** los valores no
 * informados y **no trae la recomendación embebida** —hay que pedirla aparte, por entrada y bajo
 * demanda—. El orden descendente lo garantiza el API.
 */

/** La raya larga, no un guion: es el signo de «sin dato», no una resta. */
const ABSENT = '—'

export interface ReadingValue {
  label: string
  text: string
  /** `true` cuando la magnitud no se informó: se muestra igual, marcada. */
  absent: boolean
}

export interface ReadingEvent {
  id: string
  type: 'reading'
  title: string
  at: string
  values: ReadingValue[]
}

/**
 * Orden fijo de las medidas: el mismo en todas las lecturas, para que comparar dos entradas no
 * obligue a buscar dónde está cada valor.
 */
const MEASURES: { key: keyof CareRecord, label: string, unit: string }[] = [
  { key: 'humidity', label: 'Humedad', unit: '%' },
  { key: 'temperature', label: 'Temperatura', unit: '°C' },
  { key: 'lightHours', label: 'Luz', unit: 'h' },
  { key: 'waterAmountMl', label: 'Riego', unit: 'ml' },
  { key: 'soilPh', label: 'Acidez', unit: 'pH' },
]

/**
 * Traduce lecturas a eventos de cronología. `UiTimeline` no conoce los tipos del producto (T-12),
 * así que traducir es trabajo de la feature — y cuando T-20 sirva el historial completo, se cambia
 * aquí y no en la pantalla.
 */
export function toTimelineEvents(records: CareRecord[]): ReadingEvent[] {
  return records.map((record) => {
    /*
     * Las cinco magnitudes siempre, con la ausente marcada. Omitirlas dejaba cada lectura con un
     * número distinto de columnas, y entonces dos lecturas de la misma planta no se pueden
     * comparar de un vistazo: hay que leer las etiquetas para saber qué falta en cuál.
     *
     * `!= null` a propósito: el API omite lo no informado, así que llega como `undefined`.
     */
    const values = MEASURES.map((measure) => {
      const value = record[measure.key]
      return {
        label: measure.label,
        text: value != null ? `${formatNumber(value as number)} ${measure.unit}` : ABSENT,
        absent: value == null,
      }
    })

    const informed = values.filter((value) => !value.absent).length

    return {
      id: record.id,
      type: 'reading' as const,
      title: informed === 1 ? '1 medida registrada' : `${informed} medidas registradas`,
      at: record.recordedAt,
      values,
    }
  })
}

/** Coma decimal: es lo que espera quien lee en español. */
function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

export function usePlantHistory() {
  const records = ref<CareRecord[]>([])
  const loading = ref(false)
  const error = ref<DomainError | null>(null)

  async function load(plantId: string) {
    loading.value = true
    error.value = null

    const result = await careRecordsApiService.list(plantId)
    loading.value = false

    if (!result.success) {
      error.value = result.error!
      return
    }
    // `?? []` no es paranoia: sin él, una respuesta inesperada deja la ficha entera en blanco
    // en lugar de mostrarla sin historial.
    records.value = result.data?.content ?? []
  }

  /** La recién registrada entra por delante: el API ya sirve el resto en orden descendente. */
  function prepend(record: CareRecord) {
    records.value = [record, ...records.value]
  }

  return { records, loading, error, load, prepend }
}

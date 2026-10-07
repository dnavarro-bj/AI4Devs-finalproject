import type { TimelineEvent, TimelineType as KitTimelineType } from '@ui/UiTimeline.vue'
import { STATUS_LABELS } from '@features/plants/mappers/plantProfile'
import { ALERT_CATEGORY_LABELS } from '@features/alerts/types/alert.types'
import type { Bloom, BloomStatus, InterventionType, TimelineEntry } from '../types/timeline.types'

/**
 * De la entrada del API al evento del kit. `UiTimeline` no conoce los tipos del producto, así que
 * decidir cómo se llama, qué marca lleva y de qué color es cada uno es trabajo de la feature.
 *
 * Un tipo desconocido **no se descarta**: se muestra con su valor crudo como título y la marca de
 * reserva del kit.
 */

export const TIMELINE_KIT_TYPES: KitTimelineType[] = [
  { value: 'lectura', label: 'Lecturas', mark: '∿', tone: 'brand' },
  { value: 'cambio_estado', label: 'Estado', mark: '◉', tone: 'info' },
  { value: 'movimiento', label: 'Movimientos', mark: '⌖', tone: 'neutral' },
  { value: 'comentario', label: 'Comentarios', mark: '✎', tone: 'brand' },
  { value: 'intervencion', label: 'Intervenciones', mark: '⚒', tone: 'info' },
  { value: 'floracion', label: 'Floraciones', mark: '✣', tone: 'warning' },
  { value: 'tarea', label: 'Tareas', mark: '✓', tone: 'brand' },
  { value: 'alerta', label: 'Alertas', mark: '⚑', tone: 'warning' },
]

export const INTERVENTION_LABELS: Record<InterventionType, string> = {
  trasplante: 'Trasplante',
  sustrato: 'Cambio de sustrato',
  tratamiento: 'Tratamiento',
  fertilizacion: 'Fertilización',
  poda: 'Poda',
  revision: 'Revisión',
}

export const BLOOM_STATUS_LABELS: Record<BloomStatus, string> = {
  boton: 'Botón floral',
  en_flor: 'En flor',
  finalizada: 'Finalizada',
}

/** Qué datos admite cada tipo de intervención: el formulario muestra solo los suyos. */
export const INTERVENTION_FIELDS: Record<InterventionType, { potSize: boolean, soilMix: boolean, product: boolean }> = {
  trasplante: { potSize: true, soilMix: false, product: false },
  sustrato: { potSize: false, soilMix: true, product: false },
  tratamiento: { potSize: false, soilMix: false, product: true },
  fertilizacion: { potSize: false, soilMix: false, product: true },
  poda: { potSize: false, soilMix: false, product: false },
  revision: { potSize: false, soilMix: false, product: false },
}

export interface EntryEvent extends TimelineEvent {
  /** Un solo `at` en el kit; la entrada completa la sirve quien pinta el cuerpo. */
  entryId: string
}

export function entryTitle(entry: TimelineEntry): string {
  switch (entry.type) {
    case 'lectura': {
      const r = entry.reading
      const n = r ? [r.humidity, r.temperature, r.lightHours, r.waterAmountMl, r.soilPh].filter((v) => v != null).length : 0
      return n === 1 ? '1 medida registrada' : `${n} medidas registradas`
    }
    case 'cambio_estado': {
      const c = entry.statusChange
      return c ? `${STATUS_LABELS[c.from] ?? c.from} → ${STATUS_LABELS[c.to] ?? c.to}` : 'Cambio de estado'
    }
    case 'movimiento':
      return entry.movement ? `Traslado a ${entry.movement.to.name}` : 'Movimiento'
    case 'comentario':
      return 'Comentario'
    case 'intervencion':
      return entry.intervention ? INTERVENTION_LABELS[entry.intervention.type] ?? entry.intervention.type : 'Intervención'
    case 'floracion':
      return entry.bloom ? BLOOM_STATUS_LABELS[entry.bloom.status] ?? entry.bloom.status : 'Floración'
    case 'tarea':
      return 'Tarea completada'
    case 'alerta':
      return alertTitle(entry)
    default:
      return entry.type
  }
}

const ALERT_TRANSITION_TITLES = {
  nueva: 'Alerta abierta', revisada: 'Alerta revisada', resuelta: 'Alerta resuelta', descartada: 'Alerta descartada',
} as const

/** «Alerta abierta · Temperatura»: qué le pasó a la alerta y de qué categoría es. */
function alertTitle(entry: TimelineEntry): string {
  const alert = entry.alert
  if (!alert) return 'Alerta'
  return `${ALERT_TRANSITION_TITLES[alert.to] ?? 'Alerta'} · ${ALERT_CATEGORY_LABELS[alert.category] ?? alert.category}`
}

export function toEvent(entry: TimelineEntry): EntryEvent {
  return { id: entry.id, entryId: entry.id, type: entry.type, title: entryTitle(entry), at: entry.occurredAt }
}

/** «22 may 2026». UTC: una floración se anota por día y no debe correrse por la zona horaria. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Días que abarcó la floración, contando el primero y el último; `null` si sigue abierta. */
export function bloomDays(bloom: Bloom): number | null {
  if (!bloom.endedOn) return null
  const ms = Date.parse(`${bloom.endedOn}T00:00:00Z`) - Date.parse(`${bloom.startedOn}T00:00:00Z`)
  return Math.round(ms / 86_400_000) + 1
}

/** «22 may 2026 → 25 may 2026 · 4 días», o «desde 22 may 2026 · en curso». */
export function bloomInterval(bloom: Bloom): string {
  const days = bloomDays(bloom)
  if (days === null) return `Desde ${formatDay(bloom.startedOn)} · en curso`
  return `${formatDay(bloom.startedOn)} → ${formatDay(bloom.endedOn!)} · ${days === 1 ? '1 día' : `${days} días`}`
}

/** El mes de una floración para «de un vistazo»: «Mayo de 2026». */
export function bloomMonth(bloom: Bloom): string {
  const text = new Date(`${bloom.startedOn}T00:00:00Z`)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** `datetime-local` no lleva zona: `YYYY-MM-DDTHH:mm` en hora local. Vacío si no hay fecha. */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Lo que el usuario escribió, como instante ISO; `undefined` si lo dejó vacío (el servidor pone ahora). */
export function fromLocalInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined
}

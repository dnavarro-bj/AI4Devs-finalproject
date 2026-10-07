import { relativeDay } from '@shared/utils/relativeDay'
import type { TaskInitial } from '@features/tasks/composables/useTaskWorkflow'
import type { TaskPriority, TaskType } from '@features/tasks/types/task.types'
import {
  ALERT_CATEGORY_LABELS,
  ALERT_STATUS_LABELS,
  type Alert,
  type AlertSeverity,
} from '../types/alert.types'

/**
 * Del modelo del API a lo que pintan la bandeja, el Dashboard y las fichas. Funciones puras: la
 * fecha de referencia entra por parámetro, como en el kit (ningún componente consulta el reloj).
 */

const SHORT_DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const TITLE_MAX = 80
const FULL_DATE_TIME = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
})

const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)

/** A qué se refiere la alerta: una planta (con su especie) o una localización (con su ruta). */
export interface AlertSubject {
  kind: 'plant' | 'location'
  label: string
  /** La especie de una planta; vacío en una localización. */
  detail: string
  to: string
  where: string
}

export function alertSubject(alert: Alert): AlertSubject {
  if (alert.plant) {
    return {
      kind: 'plant',
      label: alert.plant.code,
      detail: alert.plant.speciesName,
      to: `/plants/${alert.plant.id}`,
      where: alert.plant.locationPath,
    }
  }
  const location = alert.location!
  return { kind: 'location', label: location.name, detail: '', to: `/locations/${location.id}`, where: location.path }
}

/**
 * El instante completo —«7 de octubre de 2026, 16:35»—, en la hora del navegador. Acompaña a «hoy» o
 * «ayer», que dicen cuánto hace pero no cuándo. Un instante que no se puede leer devuelve cadena vacía
 * en vez de romper la tarjeta.
 */
export function fullDateTime(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? '' : FULL_DATE_TIME.format(new Date(time)).replace(' a las ', ', ')
}

/** Cuándo fue la última detección, en una palabra: «hoy», «ayer» o «hace 3 días». */
export const lastSeenText = (alert: Alert, today: string): string => relativeDay(alert.lastDetectedAt, today)

/** «Detectada ayer», o «Detectada 4 veces · última hace 2 días» cuando la alerta se repitió. */
export function detectedText(alert: Alert, today: string): string {
  const last = relativeDay(alert.lastDetectedAt, today)
  return alert.occurrences > 1
    ? `Detectada ${alert.occurrences} veces · última ${last}`
    : `Detectada ${last}`
}

/** Cómo se cerró una alerta, o `null` si sigue abierta. «Descartada» no se lee como «Resuelta». */
export function closedText(alert: Alert): { headline: string, comment: string | null } | null {
  if (alert.status !== 'resuelta' && alert.status !== 'descartada') return null
  const when = alert.closedAt ?? alert.resolvedAt
  const day = when ? SHORT_DATE.format(new Date(dayOf(when))).replace('.', '') : null
  return {
    headline: day ? `${ALERT_STATUS_LABELS[alert.status]} el ${day}` : ALERT_STATUS_LABELS[alert.status],
    comment: alert.resolutionComment?.trim() || null,
  }
}

/** El nivel de la marca del kit (`UiSeverityMark`): la crítica tiene una forma propia, no solo color. */
const MARK_LEVELS = { critica: 'high', media: 'medium', baja: 'low' } as const
export const severityMarkLevel = (severity: AlertSeverity) => MARK_LEVELS[severity]

const LEVELS = { critica: 'immediate', media: 'soon', baja: 'routine' } as const
export const severityLevel = (severity: AlertSeverity) => LEVELS[severity]

const PRIORITIES: Record<AlertSeverity, TaskPriority> = { critica: 'alta', media: 'normal', baja: 'baja' }

/**
 * Lo que la alerta precompleta en el formulario de tareas. **La correspondencia vive aquí y no en el
 * servidor**: una regla «categoría → tipo de tarea» en el API sería una segunda fuente de verdad.
 */
export function taskInitialFromAlert(alert: Alert): TaskInitial & { priority: TaskPriority, originAlertId: string } {
  const subject = alertSubject(alert)
  const type: TaskType = alert.category === 'riego' ? 'riego' : 'otra'
  const title = titleFor(alert, subject.label)

  const base = { type, title, priority: PRIORITIES[alert.severity], originAlertId: alert.id }
  if (alert.plant) {
    return {
      ...base,
      plants: [{
        id: alert.plant.id,
        code: alert.plant.code,
        nickname: alert.plant.nickname,
        detail: `${alert.plant.speciesName} · ${alert.plant.locationName}`,
      }],
    }
  }
  return { ...base, locationId: alert.location!.id }
}

function titleFor(alert: Alert, subject: string): string {
  switch (alert.category) {
    case 'riego':
      return `Regar ${subject}`
    case 'temperatura':
    case 'humedad':
    case 'luz':
      return `Revisar ${ALERT_CATEGORY_LABELS[alert.category].toLowerCase()} de ${subject}`
    case 'seguimiento':
      return `Revisar ${subject}`
    default:
      return `Atender: ${alert.reason}`.slice(0, TITLE_MAX)
  }
}

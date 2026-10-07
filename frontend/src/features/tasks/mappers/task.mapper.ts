import type { Task, TaskPriority } from '../types/task.types'

/**
 * Del modelo del API a lo que pintan la agenda, el calendario y la fila de tarea. Funciones puras:
 * la fecha de referencia entra por parámetro, como en el kit (ningún componente consulta el reloj).
 */

/** Lo que el calendario del kit espera por entrada (no se importa del kit: el kit no conoce las features). */
export interface TaskCalendarEntry {
  id: string
  date: string
  label: string
  tone: 'neutral' | 'warning' | 'danger'
}

const MS_PER_DAY = 86_400_000

const SHORT_DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

const dayOf = (day: string) => Date.parse(`${day}T00:00:00Z`)

function shortDate(day: string): string {
  return SHORT_DATE.format(new Date(dayOf(day))).replace('.', '')
}

export function addDays(day: string, days: number): string {
  return new Date(dayOf(day) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

/** A qué se dirige la tarea, en una línea: la ruta de la localización o «N plantas». */
export function targetText(task: Task): string {
  if (task.target.kind === 'location') return task.target.location.path || task.target.location.name
  return `${task.target.plantCount} ${task.target.plantCount === 1 ? 'planta' : 'plantas'}`
}

/** El periodo en una línea: un día o «7 oct – 9 oct». */
export function periodText(task: Task): string {
  return task.dueFrom === task.dueTo
    ? shortDate(task.dueFrom)
    : `${shortDate(task.dueFrom)} – ${shortDate(task.dueTo)}`
}

/** `immediate` es lo que el kit entiende por «alta»: el mismo componente, otro vocabulario. */
export function priorityLevel(priority: TaskPriority): 'immediate' | 'soon' | 'routine' {
  return { alta: 'immediate', normal: 'soon', baja: 'routine' }[priority] as 'immediate' | 'soon' | 'routine'
}

/**
 * El día con que la agenda clasifica la tarea. La agenda del kit entiende **un** día por entrada; una
 * tarea con periodo está en «Hoy» mientras hoy caiga dentro, vence cuando pasa su fin y, antes de
 * empezar, es del día en que empieza.
 */
export function agendaDue(task: Task, today: string): string {
  if (task.dueFrom <= today && today <= task.dueTo) return today
  return task.dueTo < today ? task.dueTo : task.dueFrom
}

/** Cuánto hace que venció, o `null` si no ha vencido. Se calcula; no se almacena. */
export function overdueText(dueTo: string, today: string): string | null {
  const days = Math.round((dayOf(today) - dayOf(dueTo)) / MS_PER_DAY)
  if (days <= 0) return null
  return days === 1 ? 'Hace 1 día' : `Hace ${days} días`
}

/** Cuándo es la tarea, como la agenda del prototipo la cuenta: el periodo y, debajo, hoy o cuánto hace. */
export function taskTiming(task: Task, today: string): { main: string, hint: string } {
  const current = task.dueFrom <= today && today <= task.dueTo
  return {
    main: periodText(task),
    hint: current ? 'Hoy' : (overdueText(task.dueTo, today) ?? ''),
  }
}

/** El primer y el último día del mes `YYYY-MM`: lo que se pide al API para el calendario. */
export function monthRange(month: string): { from: string, to: string } {
  const [year, number] = month.split('-').map(Number) as [number, number]
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

/**
 * Las entradas del calendario: una por cada día del periodo **dentro del mes visible**. El `id` lleva
 * el día para que sea único; es la misma tarea repetida a lo largo de su periodo.
 */
export function calendarEntries(tasks: Task[], month: string, today: string): TaskCalendarEntry[] {
  const { from, to } = monthRange(month)
  return tasks.flatMap((task) => {
    const start = task.dueFrom < from ? from : task.dueFrom
    const end = task.dueTo > to ? to : task.dueTo
    const entries: TaskCalendarEntry[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) {
      entries.push({
        id: `${task.id}:${day}`,
        date: day,
        label: task.title,
        tone: task.dueTo < today ? 'danger' : 'neutral',
      })
    }
    return entries
  })
}

/** Qué hecho concreto puede registrar completar una tarea de este tipo; los demás tipos, ninguno. */
export type CompletionRecordKind = 'reading' | 'trasplante' | 'poda'

export function completionRecordKind(type: Task['type']): CompletionRecordKind | null {
  return ({ riego: 'reading', cambio_maceta: 'trasplante', poda_raices: 'poda' } as const)[type as 'riego'] ?? null
}

/** Un instante ISO para «terminada el día X»; hoy se omite y manda el reloj del servidor. */
export function completedAtFor(day: string, today: string): string | undefined {
  if (!day || day === today) return undefined
  return new Date(`${day}T12:00:00`).toISOString()
}

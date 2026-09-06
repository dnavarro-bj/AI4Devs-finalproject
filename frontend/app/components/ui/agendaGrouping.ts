/**
 * Clasificación del trabajo pendiente por vencimiento (§14.5 del documento de producto).
 *
 * Función pura y aparte del componente: es la lógica de la agenda, y no debería necesitar el DOM
 * para probarse.
 *
 * **La fecha de referencia entra por parámetro.** Es la misma disciplina que [ADR-010] impone en
 * el backend —un único `Clock` inyectado, nadie llama a `Instant.now()`— y por el mismo motivo:
 * un componente que consulta el reloj no se puede testear sin congelar el tiempo. «Vencido» es
 * una comparación, no un hecho del universo.
 */

export type DuenessKey = 'overdue' | 'today' | 'soon' | 'later'

export interface DueEntry {
  id: string
  /** Fecha prevista en `YYYY-MM-DD`. Se compara como texto: el formato ISO ya ordena. */
  due: string
}

export interface DuenessGroup<T extends DueEntry> {
  key: DuenessKey
  label: string
  entries: T[]
}

const LABELS: Record<DuenessKey, string> = {
  overdue: 'Vencidas',
  today: 'Hoy',
  soon: 'Próximos días',
  later: 'Más adelante',
}

/** Lo vencido primero: es lo que arrastra el trabajo del día. */
const ORDER: DuenessKey[] = ['overdue', 'today', 'soon', 'later']

/** «Próximos días» son los siete siguientes a hoy; a partir de ahí es posterior. */
const SOON_DAYS = 7

export function classify(due: string, today: string): DuenessKey {
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return due <= addDays(today, SOON_DAYS) ? 'soon' : 'later'
}

export function groupByDueness<T extends DueEntry>(entries: T[], today: string): DuenessGroup<T>[] {
  return ORDER
    .map((key) => ({
      key,
      label: LABELS[key],
      // Dentro de cada grupo, de lo más urgente a lo menos.
      entries: entries.filter((entry) => classify(entry.due, today) === key)
        .sort((a, b) => a.due.localeCompare(b.due)),
    }))
    // Un grupo vacío no se muestra: ocuparía sitio para decir que no hay nada.
    .filter((group) => group.entries.length > 0)
}

/** Aritmética de fechas nativa: traer una librería para esto la ataría al proyecto para siempre. */
function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

/**
 * El reparto de un mes en semanas para el calendario.
 *
 * Aritmética de fechas nativa y no una librería: son veinte líneas que se testean enteras, y una
 * dependencia de fechas queda atada al proyecto para siempre.
 *
 * **La semana empieza en lunes**, que es la convención en España, donde está el vivero. No se hace
 * configurable hasta que exista un segundo caso.
 *
 * Todo en UTC: sin hora ni zona no hay saltos de día por el cambio horario.
 */

export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  date: string
  /** `false` en los días de relleno de los meses contiguos. */
  inMonth: boolean
}

/** `month` en `YYYY-MM`. */
export function monthWeeks(month: string): CalendarDay[][] {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number]

  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const last = new Date(Date.UTC(year, monthNumber, 0))

  // `getUTCDay()` da 0 para domingo; con la semana en lunes, domingo es el sexto.
  const leading = (first.getUTCDay() + 6) % 7
  const trailing = 6 - ((last.getUTCDay() + 6) % 7)

  const start = new Date(first)
  start.setUTCDate(start.getUTCDate() - leading)

  const total = leading + last.getUTCDate() + trailing
  const days: CalendarDay[] = []

  for (let offset = 0; offset < total; offset += 1) {
    const day = new Date(start)
    day.setUTCDate(day.getUTCDate() + offset)
    days.push({
      date: day.toISOString().slice(0, 10),
      inMonth: day.getUTCMonth() === monthNumber - 1,
    })
  }

  return chunk(days, 7)
}

/** Mes anterior o siguiente, en `YYYY-MM`. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number]
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return shifted.toISOString().slice(0, 7)
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

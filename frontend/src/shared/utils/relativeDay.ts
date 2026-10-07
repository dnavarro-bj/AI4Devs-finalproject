const MS_PER_DAY = 86_400_000

const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)

/**
 * Cuánto hace de un instante, en días de calendario y en una palabra: «hoy», «ayer» o «hace 3
 * días». La fecha de referencia entra por parámetro: nada aquí consulta el reloj.
 */
export function relativeDay(iso: string, today: string): string {
  const days = Math.round((dayOf(`${today}T00:00:00Z`) - dayOf(iso)) / MS_PER_DAY)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

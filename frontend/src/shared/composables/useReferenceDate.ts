import { MOCK_TODAY, USE_MOCK_REFERENCE_DATE } from '../mocks/referenceDate.mock'

/**
 * «Hoy», una sola vez para toda la aplicación, en `YYYY-MM-DD`.
 *
 * La agenda y el calendario del kit **no consultan el reloj**: reciben la fecha por prop (ADR-010,
 * en espíritu). Quien la fija es este composable, y la fija una vez para que Dashboard, agenda y
 * calendario coincidan en qué está vencido.
 *
 * Va en `useState`, no en una variable de módulo, para vivir con la aplicación Nuxt en lugar de
 * quedarse pegada al módulo.
 */
export function useReferenceDate() {
  return useState<string>('reference-date', () =>
    USE_MOCK_REFERENCE_DATE ? MOCK_TODAY : localDay(new Date()))
}

/** El día en la hora local del navegador, no en UTC: a las 00:30 «hoy» ya es mañana. */
function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

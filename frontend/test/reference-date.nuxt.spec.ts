import { describe, expect, it } from 'vitest'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { classify } from '../app/components/ui/agendaGrouping'

/**
 * Escenario «La fecha viene de fuera» de «Dashboard de trabajo» y la decisión «una sola fecha de
 * referencia» del design: Dashboard, agenda y calendario leen **la misma**, para que «vencida»
 * no cambie de una pantalla a otra ni los tests dependan del día en que se ejecutan.
 */
describe('fecha de referencia', () => {
  it('es la misma para quien la pida', () => {
    expect(useReferenceDate().value).toBe(useReferenceDate().value)
  })

  it('tiene formato de día ISO', () => {
    expect(useReferenceDate().value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('fija qué está vencido y qué no, sin consultar el reloj', () => {
    const today = useReferenceDate().value
    expect(classify('2000-01-01', today)).toBe('overdue')
    expect(classify(today, today)).toBe('today')
    expect(classify('2999-01-01', today)).toBe('later')
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupByDueness } from '../app/components/ui/agendaGrouping'

/**
 * La lógica de la agenda, aparte del DOM.
 *
 * **La fecha de referencia entra por parámetro**, como el `Clock` del backend (ADR-010): un test
 * que dependiera de qué día se ejecuta fallaría solo algunos días. «Vencido» es una comparación,
 * no un hecho del universo.
 */
const TODAY = '2026-09-06'

const entry = (id: string, due: string) => ({ id, due })

describe('groupByDueness', () => {
  it('reparte cada entrada en su grupo', () => {
    const groups = groupByDueness(
      [
        entry('vencida', '2026-09-01'),
        entry('hoy', '2026-09-06'),
        entry('pronto', '2026-09-09'),
        entry('lejos', '2026-10-20'),
      ],
      TODAY,
    )

    expect(groups.map((group) => group.key)).toEqual(['overdue', 'today', 'soon', 'later'])
    expect(groups.map((group) => group.entries.map((e) => e.id))).toEqual([
      ['vencida'], ['hoy'], ['pronto'], ['lejos'],
    ])
  })

  it('lo vencido va primero: es lo que arrastra', () => {
    const groups = groupByDueness([entry('lejos', '2026-12-01'), entry('vencida', '2026-01-01')], TODAY)

    expect(groups[0]!.key).toBe('overdue')
  })

  it('no devuelve grupos vacíos', () => {
    const groups = groupByDueness([entry('hoy', '2026-09-06')], TODAY)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.key).toBe('today')
  })

  it('«próximos días» son los siete siguientes; a partir de ahí es posterior', () => {
    const groups = groupByDueness(
      [entry('septimo', '2026-09-13'), entry('octavo', '2026-09-14')],
      TODAY,
    )

    expect(groups.find((group) => group.key === 'soon')!.entries.map((e) => e.id)).toEqual(['septimo'])
    expect(groups.find((group) => group.key === 'later')!.entries.map((e) => e.id)).toEqual(['octavo'])
  })

  it('dentro de cada grupo ordena de lo más urgente a lo menos', () => {
    const groups = groupByDueness(
      [entry('b', '2026-09-03'), entry('a', '2026-09-01')],
      TODAY,
    )

    expect(groups[0]!.entries.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('sin entradas no devuelve ningún grupo', () => {
    expect(groupByDueness([], TODAY)).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiAgendaList from '../app/components/ui/UiAgendaList.vue'

/** Escenarios de la requirement "Agenda por vencimiento" (`design-system`). */

const TODAY = '2026-09-06'

const ENTRIES = [
  { id: '1', due: '2026-09-01', title: 'Revisión general' },
  { id: '2', due: '2026-09-06', title: 'Regar bandeja A3' },
  { id: '3', due: '2026-09-09', title: 'Comprobar maceta' },
  { id: '4', due: '2026-10-20', title: 'Poda de raíces' },
]

const agenda = (props: Record<string, unknown> = {}) =>
  mount(UiAgendaList, { props: { entries: ENTRIES, today: TODAY, ...props } })

describe('UiAgendaList', () => {
  it('agrupa por vencimiento y pone lo vencido primero', () => {
    const wrapper = agenda()

    const headings = wrapper.findAll('[data-role="group"] h3').map((node) => node.text())
    expect(headings[0]).toContain('Vencidas')
    expect(headings).toHaveLength(4)
  })

  it('un grupo sin entradas no se muestra', () => {
    const wrapper = agenda({ entries: [ENTRIES[1]] })

    const headings = wrapper.findAll('[data-role="group"] h3').map((node) => node.text())
    expect(headings).toHaveLength(1)
    expect(headings[0]).toContain('Hoy')
  })

  it('lo vencido se distingue con texto, no solo con color', () => {
    const wrapper = agenda()

    const overdue = wrapper.findAll('[data-role="group"]')[0]!
    expect(overdue.text()).toContain('Vencidas')
    expect(overdue.attributes('data-dueness')).toBe('overdue')
  })

  it('cada entrada muestra su título y su fecha', () => {
    const wrapper = agenda()

    const first = wrapper.find('[data-role="entry"]')
    expect(first.text()).toContain('Revisión general')
    expect(first.find('time').attributes('datetime')).toBe('2026-09-01')
  })

  it('activar una entrada comunica cuál', async () => {
    const wrapper = agenda()

    await wrapper.findAll('[data-role="entry"] button')[0]!.trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toBe('1')
  })

  it('sin entradas indica que no hay trabajo pendiente', () => {
    const wrapper = agenda({ entries: [] })

    expect(wrapper.findAll('[data-role="group"]')).toHaveLength(0)
    expect(wrapper.text().toLowerCase()).toContain('pendiente')
  })
})

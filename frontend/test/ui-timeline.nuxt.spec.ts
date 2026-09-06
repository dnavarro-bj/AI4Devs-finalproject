import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiTimeline from '../app/components/ui/UiTimeline.vue'

/** Escenarios de la requirement "Cronología de eventos" (`design-system`). */

const EVENTS = [
  { id: 'a', type: 'reading', title: 'Condiciones tras una semana cálida', at: '2026-08-21T18:06:00Z' },
  { id: 'b', type: 'water', title: 'Riego de mantenimiento', at: '2026-08-16T08:42:00Z' },
  { id: 'c', type: 'photo', title: 'Nueva espinación en el ápice', at: '2026-08-02T18:14:00Z' },
  { id: 'd', type: 'reading', title: 'Revisión de agosto', at: '2026-08-01T09:00:00Z' },
]

const TYPES = [
  { value: 'reading', label: 'Lecturas', mark: '∿' },
  { value: 'water', label: 'Riegos', mark: '◇' },
  { value: 'photo', label: 'Fotografías', mark: '▧' },
]

const timeline = (props: Record<string, unknown> = {}) =>
  mount(UiTimeline, { props: { events: EVENTS, types: TYPES, ...props } })

describe('UiTimeline', () => {
  it('ordena del evento más reciente al más antiguo', () => {
    // Llegan desordenados a propósito: ordenar es responsabilidad del componente.
    const wrapper = mount(UiTimeline, {
      props: { events: [EVENTS[2], EVENTS[0], EVENTS[1]], types: TYPES },
    })

    const titles = wrapper.findAll('[data-role="event"] h3').map((node) => node.text())
    expect(titles).toEqual([
      'Condiciones tras una semana cálida',
      'Riego de mantenimiento',
      'Nueva espinación en el ápice',
    ])
  })

  it('filtrar por tipo conserva el orden y no pierde nada al quitar el filtro', async () => {
    const wrapper = timeline()
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(4)

    await wrapper.find('[data-test="filter-reading"]').trigger('click')

    const shown = wrapper.findAll('[data-role="event"] h3').map((node) => node.text())
    expect(shown).toEqual(['Condiciones tras una semana cálida', 'Revisión de agosto'])

    await wrapper.find('[data-test="filter-all"]').trigger('click')
    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(4)
  })

  it('cada evento lleva su tipo identificado y su fecha', () => {
    const wrapper = timeline()

    const first = wrapper.findAll('[data-role="event"]')[0]!
    expect(first.text()).toContain('Lecturas')
    expect(first.find('time').attributes('datetime')).toBe('2026-08-21T18:06:00Z')
  })

  it('el contenido de cada evento lo pone quien la usa, con la densidad que necesite', () => {
    const wrapper = mount(UiTimeline, {
      props: { events: EVENTS, types: TYPES },
      slots: { 'event-photo': '<img alt="Ápice" src="x">', 'event-water': '<p>450 ml</p>' },
    })

    expect(wrapper.find('img[alt="Ápice"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('450 ml')
  })

  it('un tipo desconocido se muestra igual: ocultarlo escondería algo que ocurrió', () => {
    const wrapper = mount(UiTimeline, {
      props: {
        events: [{ id: 'z', type: 'inventado', title: 'Algo nuevo', at: '2026-09-01T10:00:00Z' }],
        types: TYPES,
      },
    })

    const event = wrapper.find('[data-role="event"]')
    expect(event.exists()).toBe(true)
    expect(event.text()).toContain('Algo nuevo')
  })

  it('sin eventos explica que no hay nada registrado, y no pinta una línea vacía', () => {
    const wrapper = mount(UiTimeline, { props: { events: [], types: TYPES } })

    expect(wrapper.findAll('[data-role="event"]')).toHaveLength(0)
    expect(wrapper.text().toLowerCase()).toContain('todavía')
  })
})

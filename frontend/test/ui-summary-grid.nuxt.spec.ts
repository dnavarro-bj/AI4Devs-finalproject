import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiSummaryGrid from '../app/components/ui/UiSummaryGrid.vue'

/** Escenarios de la requirement "Resumen de estado" (`design-system`). */

const ITEMS = [
  { label: 'Último riego', value: '16 ago · 450 ml', note: 'Hace 18 días' },
  { label: 'Próxima tarea', value: 'Revisión general', note: 'Vencida hace 2 días' },
  { label: 'Última medición', value: '24 °C · 31 %', note: '21 ago' },
  { label: 'Última floración', value: 'Mayo de 2026' },
]

const grid = (props: Record<string, unknown> = {}) =>
  mount(UiSummaryGrid, { props: { title: 'De un vistazo', items: ITEMS, ...props } })

describe('UiSummaryGrid', () => {
  it('presenta cada magnitud con su etiqueta, su valor y su nota', () => {
    const wrapper = grid()

    const cells = wrapper.findAll('[data-role="summary-item"]')
    expect(cells).toHaveLength(4)
    expect(cells[0]!.text()).toContain('Último riego')
    expect(cells[0]!.text()).toContain('16 ago · 450 ml')
    expect(cells[0]!.text()).toContain('Hace 18 días')
  })

  it('una magnitud sin nota no deja un hueco', () => {
    const wrapper = grid()

    expect(wrapper.findAll('[data-role="summary-item"]')[3]!.find('small').exists()).toBe(false)
  })

  it('el valor es una línea compacta, no una cifra suelta', () => {
    // Es lo que distingue este bloque de la métrica navegable del Dashboard: aquí caben
    // «24 °C · 31 %» y «Mayo de 2026», que no son un número.
    const wrapper = grid()

    expect(wrapper.findAll('[data-role="summary-item"] strong')[2]!.text()).toBe('24 °C · 31 %')
  })

  it('lleva su encabezado con antetítulo y título', () => {
    const wrapper = grid({ eyebrow: 'Estado actual' })

    expect(wrapper.text()).toContain('Estado actual')
    expect(wrapper.find('h2, h3').text()).toBe('De un vistazo')
  })

  it('admite una acción contextual en el encabezado', () => {
    const wrapper = mount(UiSummaryGrid, {
      props: { title: 'De un vistazo', items: ITEMS },
      slots: { action: '<button type="button">Editar datos</button>' },
    })

    expect(wrapper.find('[data-test="summary-action"]').text()).toContain('Editar datos')
  })

  it('sin magnitudes no pinta una rejilla vacía', () => {
    const wrapper = grid({ items: [] })

    expect(wrapper.findAll('[data-role="summary-item"]')).toHaveLength(0)
    expect(wrapper.find('[data-role="summary-grid"]').exists()).toBe(false)
  })

  it('marca como ejemplo la magnitud que lo sea', () => {
    const wrapper = grid({
      items: [{ label: 'Próxima tarea', value: 'Revisión general', mock: true }],
    })

    expect(wrapper.find('[data-role="summary-item"][data-mock="true"]').exists()).toBe(true)
  })
})

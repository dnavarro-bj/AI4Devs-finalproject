import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiMonthRange from '../app/components/ui/UiMonthRange.vue'

/** Escenarios de la requirement "Rango de meses" (`design-system`). */

const included = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-included="true"]').map((node) => node.attributes('data-month'))

describe('UiMonthRange', () => {
  it('un periodo dentro del año incluye sus meses y ningún otro', () => {
    const wrapper = mount(UiMonthRange, { props: { from: 3, to: 10, label: 'Crecimiento' } })

    expect(included(wrapper)).toEqual(['3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('un periodo que cruza el fin de año no se parte en dos', () => {
    const wrapper = mount(UiMonthRange, { props: { from: 11, to: 2, label: 'Reposo' } })

    // Noviembre, diciembre, enero y febrero: el año es un ciclo.
    expect(included(wrapper)).toEqual(['1', '2', '11', '12'])
  })

  it('un periodo de un solo mes incluye solo ese', () => {
    const wrapper = mount(UiMonthRange, { props: { from: 5, to: 5, label: 'Floración' } })

    expect(included(wrapper)).toEqual(['5'])
  })

  it('los doce meses aparecen siempre, incluidos o no', () => {
    expect(mount(UiMonthRange, { props: { from: 5, to: 5, label: 'x' } }).findAll('[data-month]')).toHaveLength(12)
  })

  it('dice el periodo en palabras además de pintarlo', () => {
    const wrapper = mount(UiMonthRange, { props: { from: 11, to: 2, label: 'Reposo' } })

    expect(wrapper.text().toLowerCase()).toContain('noviembre')
    expect(wrapper.text().toLowerCase()).toContain('febrero')
  })
})

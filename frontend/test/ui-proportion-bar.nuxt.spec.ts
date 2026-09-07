import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiProportionBar from '../app/components/ui/UiProportionBar.vue'

/** Escenarios de la requirente "Barra de proporciones" (`design-system`). */

const bar = (parts: { label: string, value: number }[], total = 100) =>
  mount(UiProportionBar, { props: { parts, total } })

describe('UiProportionBar', () => {
  it('cuando las partes suman el total no señala ningún desajuste', () => {
    const wrapper = bar([{ label: 'Mineral', value: 70 }, { label: 'Orgánico', value: 30 }])

    expect(wrapper.find('[data-test="mismatch"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-role="part"]')).toHaveLength(2)
  })

  it('cuando no cuadra lo señala e indica en cuánto se desvía', () => {
    const wrapper = bar([{ label: 'Mineral', value: 70 }, { label: 'Orgánico', value: 20 }])

    const mismatch = wrapper.find('[data-test="mismatch"]')
    expect(mismatch.exists()).toBe(true)
    expect(mismatch.text()).toContain('10')
  })

  it('una suma que se pasa también se señala', () => {
    const wrapper = bar([{ label: 'Mineral', value: 70 }, { label: 'Orgánico', value: 50 }])

    expect(wrapper.find('[data-test="mismatch"]').text()).toContain('20')
  })

  it('el valor de cada parte se lee como texto, no solo como longitud', () => {
    const wrapper = bar([{ label: 'Mineral', value: 70 }, { label: 'Orgánico', value: 30 }])

    const first = wrapper.findAll('[data-role="part"]')[0]!
    expect(first.text()).toContain('Mineral')
    expect(first.text()).toContain('70')
  })
})

/**
 * Escenarios "Partes rotuladas dentro de la barra" y "Barra compacta en una celda".
 *
 * Las dos variantes existen porque la misma pregunta —cómo se reparte un total— se hace en una
 * ficha y en una celda de tabla. Lo que **ninguna** puede perder es leer el valor como texto y
 * señalar el desajuste: eso es lo que impide que «compacto» acabe significando «a medias».
 */
describe('UiProportionBar: variantes', () => {
  const PARTS = [{ label: 'Orgánico', value: 20 }, { label: 'Mineral', value: 80 }]

  it('rotulada por dentro, cada parte lleva su etiqueta y su valor en su propio tramo', () => {
    const wrapper = mount(UiProportionBar, { props: { parts: PARTS, labels: 'inside' } })

    const fills = wrapper.findAll('.proportion__fill')
    expect(fills[0]!.text()).toContain('Orgánico')
    expect(fills[0]!.text()).toContain('20')
    expect(fills[1]!.text()).toContain('Mineral')
  })

  it('rotulada por dentro no repite la leyenda debajo', () => {
    const wrapper = mount(UiProportionBar, { props: { parts: PARTS, labels: 'inside' } })

    expect(wrapper.find('.proportion__legend').exists()).toBe(false)
  })

  it('rotulada por dentro sigue señalando el desajuste', () => {
    const wrapper = mount(UiProportionBar, {
      props: { parts: [{ label: 'Orgánico', value: 20 }, { label: 'Mineral', value: 50 }], labels: 'inside' },
    })

    expect(wrapper.find('[data-test="mismatch"]').text()).toContain('30')
  })

  it('compacta conserva la leyenda y el valor legible', () => {
    const wrapper = mount(UiProportionBar, { props: { parts: PARTS, size: 'compact' } })

    expect(wrapper.classes()).toContain('is-compact')
    expect(wrapper.findAll('[data-role="part"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('80')
  })

  it('compacta sigue señalando el desajuste: no es una barra con menos información', () => {
    const wrapper = mount(UiProportionBar, {
      props: { parts: [{ label: 'Orgánico', value: 20 }, { label: 'Mineral', value: 50 }], size: 'compact' },
    })

    expect(wrapper.find('[data-test="mismatch"]').exists()).toBe(true)
  })

  /** Un kit que sabe qué es «orgánico» ya no es un kit: el tono entra por la parte. */
  it('el tono de cada parte lo decide quien la usa, no el componente', () => {
    const wrapper = mount(UiProportionBar, {
      props: {
        parts: [
          { label: 'Orgánico', value: 20, tone: 'warning' },
          { label: 'Mineral', value: 80, tone: 'info' },
        ],
      },
    })

    const fills = wrapper.findAll('.proportion__fill')
    expect(fills[0]!.classes()).toContain('is-warning')
    expect(fills[1]!.classes()).toContain('is-info')
  })
})

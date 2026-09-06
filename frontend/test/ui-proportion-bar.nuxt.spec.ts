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

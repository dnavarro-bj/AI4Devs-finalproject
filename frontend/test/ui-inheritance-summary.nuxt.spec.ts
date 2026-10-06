import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiInheritanceSummary from '../app/components/ui/UiInheritanceSummary.vue'

describe('UiInheritanceSummary', () => {
  const items = [
    { label: 'Temperatura', value: '8–35 °C' },
    { label: 'Riego', value: 'Cada 15–25 días' },
  ]

  it('explica el origen y presenta los valores como una pauta heredada', () => {
    const wrapper = mount(UiInheritanceSummary, {
      props: { source: 'Echinocactus grusonii', items },
    })

    expect(wrapper.text()).toContain('Hereda de')
    expect(wrapper.text()).toContain('Echinocactus grusonii')
    expect(wrapper.findAll('dl > div')).toHaveLength(2)
    expect(wrapper.find('dt').text()).toBe('Temperatura')
  })

  it('mantiene cada valor asociado a su nombre mediante una lista de definición', () => {
    const wrapper = mount(UiInheritanceSummary, {
      props: { source: 'Mammillaria elongata', items },
    })

    expect(wrapper.findAll('dt')).toHaveLength(wrapper.findAll('dd').length)
    expect(wrapper.findAll('dd')[1]!.text()).toBe('Cada 15–25 días')
  })
})

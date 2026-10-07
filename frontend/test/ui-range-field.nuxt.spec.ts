import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiRangeField from '../app/components/ui/UiRangeField.vue'

describe('UiRangeField', () => {
  it('presenta mínimo y máximo como una sola magnitud accesible', () => {
    const wrapper = mount(UiRangeField, {
      props: { label: 'Temperatura recomendada', minValue: '8', maxValue: '35', unit: '°C' },
    })

    const inputs = wrapper.findAll('input')
    expect(wrapper.find('legend').text()).toBe('Temperatura recomendada')
    expect(wrapper.findAll('label').map((label) => label.text())).toEqual(['Mínima°C', 'Máxima°C'])
    expect(inputs.map((input) => (input.element as HTMLInputElement).value)).toEqual(['8', '35'])
    expect(wrapper.findAll('label')[0]?.attributes('for')).toBe(inputs[0]?.attributes('id'))
    expect(wrapper.findAll('label')[1]?.attributes('for')).toBe(inputs[1]?.attributes('id'))
  })

  it('emite cada límite por separado y nunca incluye la unidad en el valor', async () => {
    const wrapper = mount(UiRangeField, {
      props: { label: 'Humedad recomendada', unit: '%', minValue: '', maxValue: '' },
    })

    await wrapper.findAll('input')[0]!.setValue('20')
    await wrapper.findAll('input')[1]!.setValue('40')

    expect(wrapper.emitted('update:minValue')?.at(-1)).toEqual(['20'])
    expect(wrapper.emitted('update:maxValue')?.at(-1)).toEqual(['40'])
  })

  it('asocia el error a los dos límites y conserva los identificadores de pantalla', () => {
    const wrapper = mount(UiRangeField, {
      props: {
        label: 'Horas de luz',
        unit: 'h',
        error: 'La mínima no puede superar la máxima.',
        errorTest: 'light-error',
        minTest: 'min-light',
        maxTest: 'max-light',
      },
    })

    const error = wrapper.find('[data-test="light-error"]')
    expect(wrapper.find('[data-test="min-light"]').attributes('aria-describedby')).toBe(error.attributes('id'))
    expect(wrapper.find('[data-test="max-light"]').attributes('aria-describedby')).toBe(error.attributes('id'))
    expect(wrapper.findAll('[aria-invalid="true"]')).toHaveLength(2)
  })
})

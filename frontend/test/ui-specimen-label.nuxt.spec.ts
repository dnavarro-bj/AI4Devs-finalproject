import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiSpecimenLabel from '../app/components/ui/UiSpecimenLabel.vue'

/** Escenarios "Etiqueta completa" y "Etiqueta con datos ausentes". */
describe('UiSpecimenLabel', () => {
  it('muestra código, nombre, especie y contexto, sin truncar el código', () => {
    const wrapper = mount(UiSpecimenLabel, {
      props: {
        code: 'CAT-GRUSS-01',
        name: 'Asiento de suegra',
        species: 'Echinocactus grusonii',
        details: [{ label: 'Ubicación', value: 'Invernadero 1 / A3' }],
        footnote: 'Germinada 04/2021',
      },
    })

    expect(wrapper.find('code').text()).toBe('CAT-GRUSS-01')
    expect(wrapper.text()).toContain('Asiento de suegra')
    expect(wrapper.text()).toContain('Echinocactus grusonii')
    expect(wrapper.text()).toContain('Invernadero 1 / A3')
    expect(wrapper.find('code').classes()).not.toContain('is-truncated')
  })

  it('sin código ni contexto se pinta con lo disponible, sin huecos ni datos inventados', () => {
    const wrapper = mount(UiSpecimenLabel, { props: { name: 'Bola verde', species: 'Mammillaria' } })

    expect(wrapper.find('code').exists()).toBe(false)
    expect(wrapper.find('dl').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bola verde')
    expect(wrapper.text()).not.toContain('—')
  })
})

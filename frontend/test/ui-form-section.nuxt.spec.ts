import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiFormSection from '../app/components/ui/UiFormSection.vue'

/** Escenarios de la requirement "Sección de formulario" (`design-system`). */
describe('UiFormSection', () => {
  it('muestra título, descripción y contenido, y queda nombrada por su título', () => {
    const wrapper = mount(UiFormSection, {
      props: { title: 'Identidad', description: 'Cómo reconocer este ejemplar' },
      slots: { default: '<input aria-label="Apodo">' },
    })

    expect(wrapper.find('h2, h3').text()).toBe('Identidad')
    expect(wrapper.text()).toContain('Cómo reconocer este ejemplar')
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.attributes('aria-labelledby')).toBe(wrapper.find('h2, h3').attributes('id'))
  })

  it('sin descripción no deja ningún hueco en el marcado', () => {
    const wrapper = mount(UiFormSection, { props: { title: 'Identidad' } })

    expect(wrapper.find('[data-test="section-description"]').exists()).toBe(false)
  })
})

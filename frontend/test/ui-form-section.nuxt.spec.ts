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

    // `fieldset` + `legend`: el elemento que agrupa controles, nombrado nativamente. No hace
    // falta `aria-labelledby` porque la leyenda ya nombra el grupo.
    expect(wrapper.element.tagName).toBe('FIELDSET')
    expect(wrapper.find('legend').text()).toBe('Identidad')
    expect(wrapper.text()).toContain('Cómo reconocer este ejemplar')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('sin descripción no deja ningún hueco en el marcado', () => {
    const wrapper = mount(UiFormSection, { props: { title: 'Identidad' } })

    expect(wrapper.find('[data-test="section-description"]').exists()).toBe(false)
  })

  it('con superficie propia se distingue en el marcado, para que la pantalla no lo imite con CSS', () => {
    expect(mount(UiFormSection, { props: { title: 'x', standalone: true } }).classes())
      .toContain('is-standalone')
    expect(mount(UiFormSection, { props: { title: 'x' } }).classes()).not.toContain('is-standalone')
  })
})

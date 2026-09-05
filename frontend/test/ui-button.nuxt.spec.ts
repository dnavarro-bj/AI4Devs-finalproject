import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiButton from '../app/components/ui/UiButton.vue'

/**
 * Escenarios "Variantes distinguibles", "Acción de solo icono sin nombre", "Acción en curso" y
 * "Acción destructiva" de la capability `design-system`.
 */
describe('UiButton', () => {
  it('rinde cada variante con su propia forma, no solo con su color', () => {
    for (const variant of ['primary', 'secondary', 'text', 'danger'] as const) {
      const wrapper = mount(UiButton, { props: { variant }, slots: { default: 'Guardar lectura' } })
      expect(wrapper.element.tagName).toBe('BUTTON')
      expect(wrapper.classes()).toContain(`button--${variant}`)
      expect(wrapper.text()).toBe('Guardar lectura')
    }
  })

  it('una acción de solo icono sin nombre accesible es un uso incorrecto, no un control anónimo', () => {
    expect(() => mount(UiButton, { props: { variant: 'icon' }, slots: { default: '×' } })).toThrow(
      /nombre accesible/i,
    )
  })

  it('una acción de solo icono con nombre lo expone y oculta el símbolo a la asistencia', () => {
    const wrapper = mount(UiButton, {
      props: { variant: 'icon', label: 'Cerrar' },
      slots: { default: '×' },
    })

    expect(wrapper.attributes('aria-label')).toBe('Cerrar')
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('en curso lo comunica y no admite una segunda activación', async () => {
    const wrapper = mount(UiButton, { props: { busy: true }, slots: { default: 'Creando…' } })

    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.attributes('disabled')).toBeDefined()

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('deshabilitado no emite activación', async () => {
    const wrapper = mount(UiButton, { props: { disabled: true }, slots: { default: 'Guardar' } })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('deja pasar al elemento los atributos del punto de uso', () => {
    const wrapper = mount(UiButton, {
      attrs: { 'data-test': 'generate', 'type': 'submit' },
      slots: { default: 'Generar análisis' },
    })

    expect(wrapper.attributes('data-test')).toBe('generate')
    expect(wrapper.attributes('type')).toBe('submit')
  })
})

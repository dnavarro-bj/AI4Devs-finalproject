import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiToolbarField from '../app/components/ui/UiToolbarField.vue'

describe('UiToolbarField', () => {
  it('mantiene la etiqueta accesible en un control compacto', () => {
    const wrapper = mount(UiToolbarField, {
      props: { label: 'Buscar', type: 'search', placeholder: 'Código o apodo', icon: '⌕' },
    })

    expect(wrapper.find('input').attributes('aria-label')).toBe('Buscar')
    expect(wrapper.find('.sr-only').text()).toBe('Buscar')
    expect(wrapper.find('input').attributes('placeholder')).toBe('Código o apodo')
  })

  it('comunica el valor elegido y deja los atributos en el control', async () => {
    const wrapper = mount(UiToolbarField, {
      props: {
        label: 'Localización',
        as: 'select',
        options: [{ value: 'a3', label: 'Bandeja A3' }],
      },
      attrs: { 'data-test': 'location' },
    })

    await wrapper.find('select').setValue('a3')

    expect(wrapper.find('[data-test="location"]').element.tagName).toBe('SELECT')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a3'])
  })

  /** Una opción que todavía no existe se ve —con su ticket— pero no se puede elegir. */
  it('una opción puede ir deshabilitada: se ve y no se elige', () => {
    const wrapper = mount(UiToolbarField, {
      props: {
        label: 'Ordenar por',
        as: 'select',
        options: [
          { value: 'code,asc', label: 'Código' },
          { value: 'lastReview,asc', label: 'Última revisión · T-20', disabled: true },
        ],
      },
    })

    const options = wrapper.findAll('option')
    expect(options.find((option) => option.attributes('value') === 'lastReview,asc')!.attributes('disabled')).toBeDefined()
    expect(options.find((option) => option.attributes('value') === 'code,asc')!.attributes('disabled')).toBeUndefined()
  })
})

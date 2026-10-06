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
})

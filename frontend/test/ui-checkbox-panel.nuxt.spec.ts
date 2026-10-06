import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiCheckboxPanel from '../app/components/ui/UiCheckboxPanel.vue'

describe('UiCheckboxPanel', () => {
  it('mantiene título y explicación asociados al checkbox nativo', () => {
    const wrapper = mount(UiCheckboxPanel, {
      props: {
        modelValue: true,
        title: 'Generar una recomendación',
        description: 'Usará la lectura y el historial reciente.',
      },
    })

    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('label').text()).toContain('Generar una recomendación')
    expect(wrapper.find('small').text()).toContain('historial reciente')
  })

  it('comunica la decisión y aplica los atributos al control', async () => {
    const wrapper = mount(UiCheckboxPanel, {
      props: { modelValue: true, title: 'Generar una recomendación' },
      attrs: { 'data-test': 'generate-ai' },
    })

    await wrapper.find('input').setValue(false)

    expect(wrapper.find('[data-test="generate-ai"]').element.tagName).toBe('INPUT')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiEditorNav from '../app/components/ui/UiEditorNav.vue'

/** Escenarios de la requirement "Navegación de secciones de un formulario" (`design-system`). */

const SECTIONS = [
  { value: 'species', label: 'Especie y código' },
  { value: 'identity', label: 'Identificación' },
  { value: 'origin', label: 'Origen y edad' },
]

const nav = (props: Record<string, unknown> = {}) =>
  mount(UiEditorNav, { props: { sections: SECTIONS, modelValue: 'species', ...props } })

describe('UiEditorNav', () => {
  it('presenta una entrada por sección', () => {
    expect(nav().findAll('button').map((b) => b.text())).toEqual([
      'Especie y código', 'Identificación', 'Origen y edad',
    ])
  })

  it('marca la sección actual con algo más que el color', () => {
    const wrapper = nav({ modelValue: 'identity' })

    const current = wrapper.findAll('button').filter((b) => b.attributes('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0]!.classes()).toContain('is-active')
  })

  it('elegir una sección la comunica', async () => {
    const wrapper = nav()

    await wrapper.findAll('button')[2]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('origin')
  })

  it('una sección completa lo indica con texto, no solo con una marca', () => {
    const wrapper = nav({ done: ['species'] })

    const first = wrapper.findAll('button')[0]!
    expect(first.attributes('data-done')).toBe('true')
    expect(first.text().toLowerCase()).toContain('completa')
  })

  it('la navegación tiene nombre accesible', () => {
    expect(nav().attributes('aria-label')).toBeTruthy()
  })
})

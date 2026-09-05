import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mount } from '@vue/test-utils'
import UiBreadcrumbs from '../app/components/ui/UiBreadcrumbs.vue'
import UiTabs from '../app/components/ui/UiTabs.vue'

/** Escenarios "Ruta hasta la pantalla actual" y "Pestaña activa". */
describe('UiBreadcrumbs', () => {
  it('los niveles anteriores son navegables y el último es la página actual', async () => {
    const wrapper = await mountSuspended(UiBreadcrumbs, {
      props: { items: [{ label: 'Inventario', to: '/plants' }, { label: 'Bola verde' }] },
    })

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]!.find('a').attributes('href')).toBe('/plants')
    expect(items[1]!.attributes('aria-current')).toBe('page')
    expect(items[1]!.find('a').exists()).toBe(false)
  })
})

describe('UiTabs', () => {
  const tabs = [{ value: 'resumen', label: 'Resumen' }, { value: 'fotos', label: 'Fotografías', count: 8 }]

  it('la pestaña activa se distingue por forma y se expone como seleccionada', () => {
    const wrapper = mount(UiTabs, { props: { tabs, modelValue: 'resumen' } })

    const buttons = wrapper.findAll('[role="tab"]')
    expect(buttons[0]!.attributes('aria-selected')).toBe('true')
    expect(buttons[0]!.classes()).toContain('is-active')
    expect(buttons[1]!.attributes('aria-selected')).toBe('false')
    expect(wrapper.attributes('role')).toBe('tablist')
  })

  it('seleccionar una pestaña cambia la vista local', async () => {
    const wrapper = mount(UiTabs, { props: { tabs, modelValue: 'resumen' } })

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['fotos'])
  })
})

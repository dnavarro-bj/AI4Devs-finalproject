import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiSelectionBanner from '../app/components/ui/UiSelectionBanner.vue'

/** Requirement «Aviso de selección ampliable» (`design-system`). */

const mount = (props: Record<string, unknown>, attrs: Record<string, unknown> = {}) =>
  mountSuspended(UiSelectionBanner, { props, attrs })

describe('UiSelectionBanner', () => {
  it('ofrece ampliar la selección a todo el resultado', async () => {
    const wrapper = await mount({ pageCount: 25, total: 486, allSelected: false })

    expect(wrapper.text()).toContain('Seleccionadas las 25 de esta página')
    expect(wrapper.find('button').text()).toBe('Seleccionar los 486 resultados')
  })

  it('ampliar emite select-all y no cambia por sí mismo', async () => {
    const wrapper = await mount({ pageCount: 25, total: 486, allSelected: false })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('select-all')).toHaveLength(1)
    expect(wrapper.text()).toContain('de esta página')
  })

  it('ya ampliada, dice los resultados y ofrece volver a la página', async () => {
    const wrapper = await mount({ pageCount: 25, total: 486, allSelected: true })

    expect(wrapper.text()).toContain('Seleccionados los 486 resultados')
    const back = wrapper.find('button')
    expect(back.text()).toBe('Volver a la página')

    await back.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('no se muestra si no hay más resultados que filas', async () => {
    const wrapper = await mount({ pageCount: 25, total: 25, allSelected: false })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('ampliada se muestra aunque la página ya no esté entera marcada', async () => {
    const wrapper = await mount({ pageCount: 3, total: 486, allSelected: true })

    expect(wrapper.text()).toContain('Seleccionados los 486 resultados')
  })

  it('se anuncia con aria-live y los atributos del punto de uso caen en el raíz', async () => {
    const wrapper = await mount({ pageCount: 25, total: 486, allSelected: false }, { 'data-test': 'banner' })

    expect(wrapper.attributes('data-test')).toBe('banner')
    expect(wrapper.attributes('aria-live')).toBe('polite')
  })

  it('tiene un solo elemento raíz aunque no se muestre', async () => {
    const wrapper = await mount({ pageCount: 1, total: 1, allSelected: false }, { 'data-test': 'banner' })

    expect(wrapper.attributes('data-test')).toBe('banner')
  })
})

import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiGroupNav from '../app/components/ui/UiGroupNav.vue'

/** Requirement «Navegación de grupos» (`design-system`). */

const GROUPS = [
  { id: 'all', label: 'Todas', hint: '74 especies', symbol: '⌘' },
  { id: 'sun', label: 'Pleno sol', hint: '38 especies', symbol: '☼' },
  { id: 'cold', label: 'Sensibles al frío' },
]

describe('UiGroupNav', () => {
  it('solo el grupo seleccionado está pulsado', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: GROUPS, modelValue: 'sun' } })

    const pressed = wrapper.findAll('button').map((button) => button.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'true', 'false'])
    expect(wrapper.findAll('button')[1]!.classes()).toContain('is-selected')
  })

  it('cada grupo trae símbolo, nombre y subtítulo cuando los tiene', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: GROUPS, modelValue: null } })

    const first = wrapper.findAll('button')[0]!
    expect(first.text()).toContain('⌘')
    expect(first.text()).toContain('Todas')
    expect(first.text()).toContain('74 especies')
    expect(wrapper.findAll('button')[2]!.find('small').exists()).toBe(false)
  })

  it('elegir emite el id y no cambia por sí mismo', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: GROUPS, modelValue: 'all' } })

    await wrapper.findAll('button')[2]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['cold']])
    expect(wrapper.findAll('button')[0]!.attributes('aria-pressed')).toBe('true')
  })

  it('con modelValue nulo ningún grupo se marca', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: GROUPS, modelValue: null } })

    expect(wrapper.findAll('button').every((button) => button.attributes('aria-pressed') === 'false')).toBe(true)
    expect(wrapper.find('.is-selected').exists()).toBe(false)
  })

  it('cada grupo es un botón alcanzable con el teclado y activable', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: GROUPS, modelValue: null } })

    for (const button of wrapper.findAll('button')) {
      expect(button.element.tagName).toBe('BUTTON')
      expect(button.attributes('type')).toBe('button')
      expect(button.attributes('tabindex')).toBeUndefined()
    }
  })

  it('un solo elemento raíz: los atributos del punto de uso caen en él', async () => {
    const wrapper = await mountSuspended(UiGroupNav, {
      props: { groups: GROUPS, modelValue: null },
      attrs: { 'data-test': 'groups', 'aria-label': 'Grupos de cultivo guardados' },
    })

    expect(wrapper.element.tagName).toBe('NAV')
    expect(wrapper.attributes('data-test')).toBe('groups')
    expect(wrapper.attributes('aria-label')).toBe('Grupos de cultivo guardados')
  })

  it('tiene un nombre accesible por defecto', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: GROUPS, modelValue: null } })

    expect(wrapper.attributes('aria-label')).toBeTruthy()
  })

  it('sin grupos no pinta ningún botón', async () => {
    const wrapper = await mountSuspended(UiGroupNav, { props: { groups: [], modelValue: null } })

    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})

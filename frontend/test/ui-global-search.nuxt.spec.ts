import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiGlobalSearch from '../app/components/ui/UiGlobalSearch.vue'

/**
 * Escenarios "Resultados agrupados", "Recorrido con teclado" y "Sin resultados frente a sin
 * búsqueda" de la requirement "Búsqueda global como componente" (`design-system`).
 *
 * El componente **no busca**: recibe los resultados ya agrupados y emite la selección. Es lo que
 * permite que T-21 sustituya la fuente sin tocarlo.
 */

const GROUPS = [
  {
    kind: 'plant',
    label: 'Plantas',
    results: [
      { label: 'CAT-GRUSS-01', detail: 'Bola verde', to: '/plants' },
      { label: 'CAT-GRUSS-02', detail: 'Erizo', to: '/plants' },
    ],
  },
  {
    kind: 'species',
    label: 'Especies',
    results: [{ label: 'Echinocactus grusonii', detail: 'Asiento de suegra', to: '/species' }],
  },
]

async function search(props: Record<string, unknown> = {}) {
  return mountSuspended(UiGlobalSearch, { props: { modelValue: '', groups: [], ...props } })
}

describe('UiGlobalSearch', () => {
  it('se expone como un campo de búsqueda con su lista de resultados', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })

    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('search')
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-expanded')).toBe('true')
    // El campo apunta a la lista que controla, y esa lista existe.
    const controlled = input.attributes('aria-controls')
    expect(controlled).toBeTruthy()
    expect(wrapper.find(`#${controlled}`).attributes('role')).toBe('listbox')
  })

  it('presenta los resultados agrupados, con cada grupo identificado por su tipo', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })

    const groups = wrapper.findAll('[role="group"]')
    expect(groups).toHaveLength(2)
    expect(groups[0]!.text()).toContain('Plantas')
    expect(groups[0]!.attributes('aria-label')).toBe('Plantas')
    expect(groups[1]!.text()).toContain('Especies')

    expect(wrapper.findAll('[role="option"]')).toHaveLength(3)
  })

  it('recorre los resultados con las flechas, atravesando los grupos', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })
    const input = wrapper.find('input')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.findAll('[role="option"]')[0]!.attributes('aria-selected')).toBe('true')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    // El tercero está en el segundo grupo: el recorrido no se detiene en el borde del grupo.
    const options = wrapper.findAll('[role="option"]')
    expect(options[2]!.attributes('aria-selected')).toBe('true')
    expect(input.attributes('aria-activedescendant')).toBe(options[2]!.attributes('id'))
  })

  it('emite el resultado activo al pulsar Enter', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })
    const input = wrapper.find('input')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ label: 'CAT-GRUSS-01' })
  })

  it('activa un resultado al pulsarlo con el ratón', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })

    await wrapper.findAll('[role="option"]')[1]!.trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ label: 'CAT-GRUSS-02' })
  })

  it('no emite nada al pulsar Enter sin resultado activo', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })

    await wrapper.find('input').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('cierra la lista con Escape', async () => {
    const wrapper = await search({ modelValue: 'gruss', groups: GROUPS })
    const input = wrapper.find('input')

    await input.trigger('keydown', { key: 'Escape' })

    expect(input.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
  })

  it('distingue no haber encontrado nada de no haber buscado todavía', async () => {
    const searched = await search({ modelValue: 'zzz', groups: [] })
    expect(searched.find('[data-test="no-results"]').exists()).toBe(true)

    const untouched = await search({ modelValue: '', groups: [] })
    expect(untouched.find('[data-test="no-results"]').exists()).toBe(false)
    expect(untouched.find('input').attributes('aria-expanded')).toBe('false')
  })

  it('el campo tiene nombre accesible aunque no lleve etiqueta visible', async () => {
    const wrapper = await search()

    expect(wrapper.find('input').attributes('aria-label')).toBeTruthy()
  })
})

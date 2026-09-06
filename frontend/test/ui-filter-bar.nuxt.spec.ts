import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiFilterBar from '../app/components/ui/UiFilterBar.vue'

/** Escenarios de la requirement "Barra de filtros" (`design-system`). */

const APPLIED = [
  { id: 'location', label: 'Localización: Invernadero 1' },
  { id: 'status', label: 'Estado: Revisar' },
]

const bar = (props: Record<string, unknown> = {}) =>
  mount(UiFilterBar, { props: { applied: APPLIED, ...props } })

describe('UiFilterBar', () => {
  it('muestra cada criterio aplicado como un filtro retirable', () => {
    const wrapper = bar()

    const chips = wrapper.findAll('.filter-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0]!.text()).toContain('Localización: Invernadero 1')
  })

  it('retirar un criterio comunica cuál, y los demás siguen', async () => {
    const wrapper = bar()

    await wrapper.findAll('.filter-chip button')[0]!.trigger('click')

    expect(wrapper.emitted('remove')?.[0]?.[0]).toBe('location')
    // El componente no decide: quien retira de verdad es la pantalla, así que sigue pintando dos.
    expect(wrapper.findAll('.filter-chip')).toHaveLength(2)
  })

  it('sin ningún criterio aplicado no ofrece limpiar: no habría nada que limpiar', () => {
    const wrapper = bar({ applied: [] })

    expect(wrapper.find('[data-test="clear-filters"]').exists()).toBe(false)
    expect(wrapper.findAll('.filter-chip')).toHaveLength(0)
  })

  it('con criterios aplicados ofrece limpiarlos todos de una vez', async () => {
    const wrapper = bar()

    await wrapper.find('[data-test="clear-filters"]').trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('aloja los controles de filtrado que le pase la pantalla', () => {
    const wrapper = mount(UiFilterBar, {
      props: { applied: [] },
      slots: { default: '<button type="button">Localización</button>' },
    })

    expect(wrapper.find('[data-test="filter-controls"]').text()).toContain('Localización')
  })

  it('la barra tiene nombre accesible', () => {
    // Lo da la leyenda del `fieldset`, no un `aria-label`: el grupo se nombra nativamente.
    expect(bar({ label: 'Filtros' }).find('legend').text()).toBe('Filtros')
  })
})

/**
 * La barra agrupa controles de formulario, así que es un `fieldset` con su `legend`: el grupo
 * queda nombrado nativamente y no depende de un `aria-label`.
 */
describe('UiFilterBar: semántica y alineación', () => {
  it('es un fieldset nombrado por su leyenda', () => {
    const wrapper = bar({ label: 'Filtros del inventario' })

    expect(wrapper.element.tagName).toBe('FIELDSET')
    expect(wrapper.find('legend').text()).toBe('Filtros del inventario')
  })

  it('la leyenda no ocupa sitio: nombra sin dibujarse', () => {
    expect(bar().find('legend').classes()).toContain('sr-only')
  })

  it('alinea los controles por arriba, no por el centro', () => {
    // Es lo que hace que los campos con ayuda no desplacen su control respecto a los que no la
    // tienen: los rótulos coinciden, y con ellos los controles.
    const wrapper = mount(UiFilterBar, {
      props: { applied: [] },
      slots: { default: '<div class="field">x</div>' },
    })

    expect(wrapper.find('[data-test="filter-controls"]').classes()).toContain('filter-bar__controls')
  })
})

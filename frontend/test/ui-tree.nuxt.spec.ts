import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiTree from '../app/components/ui/UiTree.vue'

/** Escenarios de la requirement "Árbol jerárquico" (`design-system`). */

// La jerarquía del producto: vivero > invernadero > bancada > bandeja (§16).
const NODES = [
  {
    id: '1',
    label: 'Invernadero 1',
    count: 486,
    children: [
      {
        id: '2',
        label: 'Bancada norte',
        count: 120,
        children: [{ id: '3', label: 'Bandeja A3', count: 24 }],
      },
    ],
  },
  { id: '9', label: 'Zona exterior', count: 407 },
]

const tree = (props: Record<string, unknown> = {}) => mount(UiTree, { props: { nodes: NODES, ...props } })

describe('UiTree', () => {
  it('un nodo con descendientes ofrece plegarse y expone su estado', async () => {
    const wrapper = tree()

    const toggle = wrapper.find('[data-test="toggle-1"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('aria-expanded')).toBe('true')

    await toggle.trigger('click')
    expect(wrapper.find('[data-test="toggle-1"]').attributes('aria-expanded')).toBe('false')
  })

  it('plegar un nodo esconde a sus descendientes', async () => {
    const wrapper = tree()

    expect(wrapper.text()).toContain('Bandeja A3')
    await wrapper.find('[data-test="toggle-1"]').trigger('click')

    expect(wrapper.text()).not.toContain('Bandeja A3')
  })

  it('un nodo hoja no ofrece plegado: no hay nada que plegar', () => {
    const wrapper = tree()

    expect(wrapper.find('[data-test="toggle-9"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Zona exterior')
  })

  it('el recuento acompaña al nombre y se distingue de él', () => {
    const wrapper = tree()

    const count = wrapper.find('[data-test="count-1"]')
    expect(count.exists()).toBe(true)
    expect(count.text()).toContain('486')
  })

  it('un nodo sin recuento no muestra un hueco vacío', () => {
    const wrapper = mount(UiTree, { props: { nodes: [{ id: '1', label: 'Sin datos' }] } })

    expect(wrapper.find('[data-test="count-1"]').exists()).toBe(false)
  })

  it('activar un nodo comunica cuál se ha elegido, a cualquier profundidad', async () => {
    const wrapper = tree()

    await wrapper.find('[data-test="select-3"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toBe('3')
  })

  it('se presenta como árbol para las tecnologías de asistencia', () => {
    const wrapper = tree()

    expect(wrapper.attributes('role')).toBe('tree')
    expect(wrapper.findAll('[role="treeitem"]').length).toBeGreaterThanOrEqual(4)
  })
})

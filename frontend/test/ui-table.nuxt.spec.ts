import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiTable from '../app/components/ui/UiTable.vue'

/** Escenarios de la requirement "Tabla de datos con selección y acciones masivas". */
const columns = [
  { key: 'nickname', label: 'Planta' },
  { key: 'location', label: 'Localización' },
]

const rows = [
  { id: '1', nickname: 'Bola verde', location: 'Invernadero 1' },
  { id: '2', nickname: 'Pinchitos', location: 'Invernadero 2' },
]

function table(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(UiTable, { props: { columns, rows, rowKey: 'id', ...props }, slots })
}

describe('UiTable', () => {
  it('pinta una fila por elemento con sus columnas', () => {
    const wrapper = table()

    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['Planta', 'Localización'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('Bola verde')
  })

  it('sin selección no hay barra de acciones masivas', () => {
    const wrapper = table({ selectable: true }, { 'bulk-actions': '<button>Mover</button>' })

    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(false)
  })

  it('con selección la barra aparece y declara cuántos elementos afecta', async () => {
    const wrapper = table({ selectable: true }, { 'bulk-actions': '<button>Mover</button>' })

    await wrapper.findAll('tbody input[type="checkbox"]')[0]!.setValue(true)
    // La selección la gobierna quien usa la tabla (`v-model:selected`); aquí se devuelve a mano.
    await wrapper.setProps({ selected: wrapper.emitted('update:selected')!.at(-1)![0] as string[] })

    const bar = wrapper.find('[data-role="bulk-actions"]')
    expect(bar.exists()).toBe(true)
    // Cantidad y alcance antes de ejecutar nada (patterns.md, "Selección masiva").
    expect(bar.text()).toContain('Selección: 1 de 2')
    expect(bar.text()).toContain('Mover')
    expect(wrapper.emitted('update:selected')?.at(0)).toEqual([['1']])
  })

  it('la selección global marca todas las filas mostradas', async () => {
    const wrapper = table({ selectable: true })

    await wrapper.find('thead input[type="checkbox"]').setValue(true)

    expect(wrapper.emitted('update:selected')?.at(-1)).toEqual([['1', '2']])
  })

  it('cada selector de fila tiene nombre accesible', () => {
    const wrapper = table({ selectable: true })

    const labels = wrapper.findAll('tbody input[type="checkbox"]').map((input) => input.attributes('aria-label'))
    expect(labels).toEqual(['Seleccionar Bola verde', 'Seleccionar Pinchitos'])
  })

  it('conserva desplazamiento horizontal en lugar de perder columnas', () => {
    expect(table().find('.table-frame').exists()).toBe(true)
  })
})

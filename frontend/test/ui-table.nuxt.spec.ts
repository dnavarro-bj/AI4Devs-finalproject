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

/**
 * Escenarios "Ordenar por una columna", "Invertir el sentido" y "Columna no ordenable" de la
 * requirement "Tabla de datos con selección y acciones masivas" (`design-system`).
 */
describe('UiTable: ordenación', () => {
  const SORTABLE = [
    { key: 'nickname', label: 'Planta', sortable: true },
    { key: 'species', label: 'Especie', sortable: true },
    { key: 'location', label: 'Localización' },
  ]

  const ROWS = [
    { id: '1', nickname: 'Zeta', species: 'C', location: 'A3' },
    { id: '2', nickname: 'Alfa', species: 'A', location: 'A4' },
  ]

  const table = (props: Record<string, unknown> = {}) =>
    mount(UiTable, { props: { columns: SORTABLE, rows: ROWS, rowKey: 'id', ...props } })

  it('el encabezado de una columna ordenable es activable y emite el criterio', async () => {
    const wrapper = table()

    await wrapper.findAll('th button')[0]!.trigger('click')

    expect(wrapper.emitted('update:sort')?.[0]?.[0]).toEqual({ key: 'nickname', direction: 'asc' })
  })

  it('marca la columna ordenada y su sentido para las tecnologías de asistencia', async () => {
    const wrapper = table({ sort: { key: 'nickname', direction: 'asc' } })

    const headers = wrapper.findAll('th')
    expect(headers[0]!.attributes('aria-sort')).toBe('ascending')
    expect(headers[1]!.attributes('aria-sort')).toBe('none')
  })

  it('volver a activar la columna ya ordenada invierte el sentido', async () => {
    const wrapper = table({ sort: { key: 'nickname', direction: 'asc' } })

    await wrapper.findAll('th button')[0]!.trigger('click')

    expect(wrapper.emitted('update:sort')?.[0]?.[0]).toEqual({ key: 'nickname', direction: 'desc' })
  })

  it('una columna no declarada ordenable no tiene encabezado activable', () => {
    const wrapper = table()

    // Solo las dos ordenables llevan botón; la tercera es texto.
    expect(wrapper.findAll('th button')).toHaveLength(2)
    expect(wrapper.findAll('th')[2]!.attributes('aria-sort')).toBeUndefined()
  })

  it('no reordena las filas por su cuenta: solo hay una página delante', async () => {
    const wrapper = table({ sort: { key: 'nickname', direction: 'asc' } })

    // Llegan en el orden en que las sirve quien las pidió, y así se pintan.
    const firstCells = wrapper.findAll('tbody tr').map((row) => row.findAll('td')[0]!.text())
    expect(firstCells).toEqual(['Zeta', 'Alfa'])
  })

  it('cambiar el orden no pierde la selección en curso', async () => {
    const wrapper = table({ selectable: true, selected: ['1'] })

    await wrapper.findAll('th button')[0]!.trigger('click')

    expect(wrapper.emitted('update:selected')).toBeUndefined()
    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(true)
  })
})

/**
 * Escenarios "Ocultar una columna" y "La columna identificativa no se puede ocultar" de la misma
 * requirement.
 */
describe('UiTable: columnas y densidad', () => {
  const COLUMNS = [
    { key: 'nickname', label: 'Planta' },
    { key: 'species', label: 'Especie' },
    { key: 'location', label: 'Localización' },
  ]

  const ROWS = [{ id: '1', nickname: 'Bola verde', species: 'E. grusonii', location: 'A3' }]

  const table = (props: Record<string, unknown> = {}) =>
    mount(UiTable, { props: { columns: COLUMNS, rows: ROWS, rowKey: 'id', ...props } })

  it('sin declarar columnas visibles las muestra todas', () => {
    expect(table().findAll('thead th')).toHaveLength(3)
  })

  it('ocultar una columna la retira y deja las demás', () => {
    const wrapper = table({ visibleColumns: ['nickname', 'location'] })

    const headers = wrapper.findAll('thead th').map((header) => header.text())
    expect(headers).toEqual(['Planta', 'Localización'])
    expect(wrapper.findAll('tbody td')).toHaveLength(2)
  })

  it('la columna identificativa no está entre las que se pueden ocultar', () => {
    const wrapper = table()

    // Sin ella una fila deja de poder reconocerse.
    const hideable = (wrapper.vm as unknown as { hideableColumns: { key: string }[] }).hideableColumns
    expect(hideable.map((column) => column.key)).toEqual(['species', 'location'])
  })

  it('ocultarla de todos modos no la retira', () => {
    const wrapper = table({ visibleColumns: ['species'] })

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual(['Planta', 'Especie'])
  })

  it('ocultar una columna no pierde la selección en curso', async () => {
    const wrapper = table({ selectable: true, selected: ['1'], visibleColumns: ['nickname'] })

    expect(wrapper.emitted('update:selected')).toBeUndefined()
    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(true)
  })

  it('la densidad compacta se refleja en el marcado', () => {
    expect(table({ density: 'compact' }).find('table').classes()).toContain('is-compact')
    expect(table().find('table').classes()).not.toContain('is-compact')
  })
})

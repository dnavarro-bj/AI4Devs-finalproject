import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiYearGrid from '../app/components/ui/UiYearGrid.vue'

/** Escenarios de la requirement «Pauta anual» (`design-system`). */

const GROWTH = [0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0]
const FLOWER = [0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0]
const WATER = [1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1]

const grid = (props: Record<string, unknown> = {}) =>
  mount(UiYearGrid, {
    props: {
      rows: [
        { label: 'Crecimiento', levels: GROWTH, tone: 'brand' },
        { label: 'Floración', levels: FLOWER, tone: 'warning' },
        { label: 'Riego', levels: WATER, tone: 'info' },
      ],
      ...props,
    },
  })

describe('UiYearGrid', () => {
  it('rotula los doce meses una sola vez, en la cabecera', () => {
    const head = grid().findAll('[data-role="month-head"]')

    expect(head).toHaveLength(12)
    expect(head[0]!.text()).toBe('Ene')
    expect(head[11]!.text()).toBe('Dic')
  })

  it('cada pauta ocupa su fila, con su nombre', () => {
    const rows = grid().findAll('[data-role="year-row"]')

    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('Crecimiento')
    expect(rows[2]!.text()).toContain('Riego')
  })

  it('cada fila tiene doce celdas, una por mes', () => {
    const cells = grid().findAll('[data-role="year-row"]')[0]!.findAll('[data-role="month"]')

    expect(cells).toHaveLength(12)
  })

  /** Lo que distingue esta rejilla de una lista de periodos: la fuerza, no solo el sí o el no. */
  it('representa la intensidad de cada mes, no solo si hay actividad', () => {
    const water = grid().findAll('[data-role="year-row"]')[2]!.findAll('[data-role="month"]')

    expect(water[0]!.attributes('data-level')).toBe('1')
    expect(water[2]!.attributes('data-level')).toBe('2')
    expect(water[4]!.attributes('data-level')).toBe('3')
  })

  it('un mes sin actividad se distingue de uno con la intensidad más baja', () => {
    const growth = grid().findAll('[data-role="year-row"]')[0]!.findAll('[data-role="month"]')

    expect(growth[0]!.attributes('data-level')).toBe('0')
    expect(growth[2]!.attributes('data-level')).toBe('3')
  })

  /** La rejilla vacía sigue diciendo qué se va a poder registrar: no puede desaparecer. */
  it('sin actividad ninguna, la rejilla se muestra igual', () => {
    const wrapper = grid({
      rows: [
        { label: 'Crecimiento', levels: Array(12).fill(0) },
        { label: 'Floración', levels: Array(12).fill(0) },
      ],
    })

    expect(wrapper.findAll('[data-role="month-head"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="year-row"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-role="year-row"]')[0]!.findAll('[data-role="month"]')).toHaveLength(12)
  })

  it('con menos de doce valores la rejilla no se descuadra', () => {
    const wrapper = grid({ rows: [{ label: 'Corta', levels: [3, 3, 3] }] })

    const cells = wrapper.findAll('[data-role="year-row"]')[0]!.findAll('[data-role="month"]')
    expect(cells).toHaveLength(12)
    expect(cells[11]!.attributes('data-level')).toBe('0')
  })

  it('con más de doce valores solo se pintan los doce meses', () => {
    const wrapper = grid({ rows: [{ label: 'Larga', levels: Array(20).fill(3) }] })

    expect(wrapper.findAll('[data-role="year-row"]')[0]!.findAll('[data-role="month"]')).toHaveLength(12)
  })

  /** Un kit que sabe qué es «crecimiento» deja de ser un kit. */
  it('el tono de cada pauta lo decide quien la usa', () => {
    const rows = grid().findAll('[data-role="year-row"]')

    expect(rows[0]!.classes()).toContain('is-brand')
    expect(rows[1]!.classes()).toContain('is-warning')
  })

  it('una intensidad en color no se interpreta sola: muestra la leyenda que le pasen', () => {
    const wrapper = grid({
      legend: [
        { tone: 'brand', label: 'Crecimiento' },
        { tone: 'info', label: 'Intensidad de riego' },
      ],
    })

    const legend = wrapper.find('[data-test="legend"]')
    expect(legend.text()).toContain('Crecimiento')
    expect(legend.text()).toContain('Intensidad de riego')
  })

  it('sin leyenda no deja un hueco vacío', () => {
    expect(grid().find('[data-test="legend"]').exists()).toBe(false)
  })

  it('cada fila se anuncia con los meses en los que tiene actividad', () => {
    const row = grid().findAll('[data-role="year-row"]')[1]!

    // Floración: mayo, junio y julio.
    expect(row.attributes('aria-label')).toContain('Floración')
    expect(row.attributes('aria-label')).toContain('may')
  })

  it('una pauta sin actividad lo dice, en vez de anunciarse vacía', () => {
    const wrapper = grid({ rows: [{ label: 'Floración', levels: Array(12).fill(0) }] })

    expect(wrapper.findAll('[data-role="year-row"]')[0]!.attributes('aria-label')).toContain('sin')
  })

  it('tiene un solo elemento raíz, así que hereda los atributos del punto de uso', () => {
    expect(grid().attributes('role')).toBe('table')
  })
})

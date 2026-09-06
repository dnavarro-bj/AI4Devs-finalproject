import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiCalendarMonth from '../app/components/ui/UiCalendarMonth.vue'

/** Escenarios de la requirement "Calendario mensual" (`design-system`). */

const ENTRIES = [
  { id: '1', date: '2026-09-08', label: 'Regar A3' },
  { id: '2', date: '2026-09-08', label: 'Regar A4' },
  { id: '3', date: '2026-09-08', label: 'Revisar maceta' },
  { id: '4', date: '2026-09-08', label: 'Poda' },
  { id: '5', date: '2026-09-15', label: 'Trasplante' },
]

const calendar = (props: Record<string, unknown> = {}) =>
  mount(UiCalendarMonth, { props: { month: '2026-09', today: '2026-09-06', entries: ENTRIES, ...props } })

describe('UiCalendarMonth', () => {
  it('la primera columna es lunes', () => {
    const wrapper = calendar()

    const headers = wrapper.findAll('thead th').map((node) => node.text())
    expect(headers[0]).toContain('L')
    expect(headers).toHaveLength(7)
  })

  it('los días de los meses contiguos se distinguen de los del mes actual', () => {
    const wrapper = calendar()

    const outside = wrapper.findAll('[data-role="day"][data-in-month="false"]')
    expect(outside.length).toBeGreaterThan(0)
    // Septiembre de 2026 empieza en martes: hay un día de relleno por delante.
    expect(wrapper.findAll('[data-role="day"]')).toHaveLength(35)
  })

  it('marca el día de referencia', () => {
    const wrapper = calendar()

    const today = wrapper.findAll('[data-role="day"][data-today="true"]')
    expect(today).toHaveLength(1)
    expect(today[0]!.attributes('data-date')).toBe('2026-09-06')
  })

  it('un día con más entradas de las que caben indica cuántas quedan', () => {
    const wrapper = calendar({ maxPerDay: 2 })

    const crowded = wrapper.find('[data-date="2026-09-08"]')
    expect(crowded.findAll('[data-role="entry"]')).toHaveLength(2)
    // Cuatro entradas, dos mostradas: quedan dos, y se dice.
    expect(crowded.text()).toContain('2')
    expect(crowded.find('[data-test="overflow"]').exists()).toBe(true)
  })

  it('un día que cabe entero no anuncia desbordamiento', () => {
    const wrapper = calendar({ maxPerDay: 5 })

    expect(wrapper.find('[data-date="2026-09-08"]').find('[data-test="overflow"]').exists()).toBe(false)
  })

  it('cambiar de mes comunica cuál se ha pedido', async () => {
    const wrapper = calendar()

    await wrapper.find('[data-test="next-month"]').trigger('click')
    await wrapper.find('[data-test="previous-month"]').trigger('click')

    expect(wrapper.emitted('update:month')).toEqual([['2026-10'], ['2026-08']])
  })

  it('elegir un día comunica cuál', async () => {
    const wrapper = calendar()

    await wrapper.find('[data-date="2026-09-15"] button').trigger('click')

    expect(wrapper.emitted('select-day')?.[0]?.[0]).toBe('2026-09-15')
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiScale from '../app/components/ui/UiScale.vue'

/** Escenarios de la requirement «Escala con rango» (`design-system`). */

const scale = (props: Record<string, unknown> = {}) =>
  mount(UiScale, {
    props: { min: 0, max: 14, from: 5.8, to: 6.8, lowLabel: 'Ácido', highLabel: 'Alcalino', ...props },
  })

/** El ancho de un tramo, en tanto por ciento, leído del estilo en línea. */
const widthOf = (wrapper: ReturnType<typeof scale>) =>
  Number((wrapper.find('[data-test="span"]').attributes('style') ?? '').match(/width:\s*([\d.]+)%/)?.[1] ?? '0')

const leftOf = (wrapper: ReturnType<typeof scale>) =>
  Number((wrapper.find('[data-test="span"]').attributes('style') ?? '').match(/left:\s*([\d.]+)%/)?.[1] ?? '0')

describe('UiScale', () => {
  it('sitúa el rango en su tramo de la escala', () => {
    const wrapper = scale()

    // 5,8 sobre 0–14 es el 41,4 %; el tramo hasta 6,8 mide el 7,1 %.
    expect(leftOf(wrapper)).toBeCloseTo(41.4, 1)
    expect(widthOf(wrapper)).toBeCloseTo(7.1, 1)
  })

  it('los dos valores se leen como texto, no solo como posición', () => {
    expect(scale().text()).toContain('5.8')
    expect(scale().text()).toContain('6.8')
  })

  it('nombra los dos extremos de la escala', () => {
    const text = scale().text()

    expect(text).toContain('Ácido')
    expect(text).toContain('Alcalino')
  })

  /** Un rango de anchura cero desaparecería: se le deja un mínimo visible. */
  it('un rango de un solo punto sigue viéndose', () => {
    const wrapper = scale({ from: 6.5, to: 6.5 })

    expect(widthOf(wrapper)).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('6.5')
  })

  it('un rango que se sale por arriba se recorta a la escala, no la desborda', () => {
    const wrapper = scale({ from: 12, to: 20 })

    expect(leftOf(wrapper) + widthOf(wrapper)).toBeLessThanOrEqual(100)
    // El valor sigue leyéndose aunque el dibujo se recorte.
    expect(wrapper.text()).toContain('20')
  })

  it('un rango que se sale por abajo empieza en el principio de la escala', () => {
    const wrapper = scale({ from: -3, to: 2 })

    expect(leftOf(wrapper)).toBe(0)
    expect(wrapper.text()).toContain('-3')
  })

  it('describe el rango para quien no ve la escala', () => {
    expect(scale({ label: 'Rango de pH' }).attributes('aria-label')).toContain('Rango de pH')
  })

  it('tiene un solo elemento raíz, así que hereda los atributos del punto de uso', () => {
    expect(scale().attributes('role')).toBe('img')
  })
})

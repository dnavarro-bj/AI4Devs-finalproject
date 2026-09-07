import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiProportionWheel from '../app/components/ui/UiProportionWheel.vue'

/** Escenarios de la requirement «Rueda de proporción» (`design-system`). */

const PARTS = [
  { label: 'Orgánico', value: 20, tone: 'warning' as const },
  { label: 'Mineral', value: 80, tone: 'info' as const },
]

const wheel = (props: Record<string, unknown> = {}) =>
  mount(UiProportionWheel, { props: { parts: PARTS, ...props } })

describe('UiProportionWheel', () => {
  it('presenta la parte dominante como cifra en el centro', () => {
    const center = wheel().find('[data-test="wheel-center"]')

    expect(center.text()).toContain('80')
  })

  it('el resto del reparto acompaña a la cifra dominante', () => {
    // 80 manda, pero 20 tiene que estar: si no, la rueda dice una mitad de la verdad.
    expect(wheel().text()).toContain('20')
  })

  /** Quien no ve el anillo tiene que enterarse igual: el dibujo no es el dato. */
  it('describe su contenido, no solo lo dibuja', () => {
    const label = wheel().attributes('aria-label')

    expect(label).toContain('Orgánico')
    expect(label).toContain('20')
    expect(label).toContain('Mineral')
    expect(label).toContain('80')
  })

  it('cada parte recibe el tono que le pasan, no uno que el componente decida', () => {
    const sectors = wheel().findAll('[data-role="sector"]')

    expect(sectors[0]!.classes()).toContain('is-warning')
    expect(sectors[1]!.classes()).toContain('is-info')
  })

  it('funciona con más de dos partes, sin dar por hecho que son exactamente dos', () => {
    const wrapper = wheel({
      parts: [
        { label: 'Turba', value: 30 },
        { label: 'Pómez', value: 50 },
        { label: 'Akadama', value: 20 },
      ],
    })

    expect(wrapper.findAll('[data-role="sector"]')).toHaveLength(3)
    expect(wrapper.find('[data-test="wheel-center"]').text()).toContain('50')
  })

  it('con una sola parte no se rompe: es el 100 %', () => {
    const wrapper = wheel({ parts: [{ label: 'Mineral', value: 100 }] })

    expect(wrapper.find('[data-test="wheel-center"]').text()).toContain('100')
  })

  it('tiene un solo elemento raíz, así que hereda los atributos del punto de uso', () => {
    // Un comentario suelto en el template lo convertiría en fragmento y se tragaría el data-test.
    expect(wheel({}).attributes('role')).toBe('img')
  })
})

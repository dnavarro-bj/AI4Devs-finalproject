import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiSeverityMark from '../app/components/ui/UiSeverityMark.vue'

/** La gravedad se lee: cada nivel tiene su forma y su texto, y el color solo la refuerza. */
describe('UiSeverityMark', () => {
  const mount = (props: Record<string, unknown>, text = 'Crítica') =>
    mountSuspended(UiSeverityMark, { props, slots: { default: () => text } })

  it('cada nivel tiene un glifo distinto', async () => {
    const glyphs = await Promise.all((['high', 'medium', 'low'] as const).map(
      async (level) => (await mount({ level })).find('.severity-mark__glyph').text(),
    ))

    expect(new Set(glyphs).size).toBe(3)
    expect(glyphs[0]).toBe('▲')
  })

  it('dice el texto del slot junto al glifo', async () => {
    const wrapper = await mount({ level: 'high' })

    expect(wrapper.text()).toBe('▲ Crítica')
  })

  it('el glifo no se lee: lo que se lee es el texto', async () => {
    const wrapper = await mount({ level: 'high' })

    expect(wrapper.find('.severity-mark__glyph').attributes('aria-hidden')).toBe('true')
  })

  it('con mark-only pinta solo el glifo', async () => {
    const wrapper = await mount({ level: 'medium', markOnly: true })

    expect(wrapper.text()).toBe('●')
  })

  it('tiene un único elemento raíz y deja pasar los atributos del punto de uso', async () => {
    const wrapper = await mountSuspended(UiSeverityMark, { props: { level: 'low' }, attrs: { 'data-test': 'mark' } })

    expect(wrapper.attributes('data-test')).toBe('mark')
    expect(wrapper.classes()).toContain('severity-mark--low')
  })
})

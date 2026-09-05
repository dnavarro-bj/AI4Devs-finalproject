import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiPriority from '../app/components/ui/UiPriority.vue'
import UiStatus from '../app/components/ui/UiStatus.vue'

/**
 * Escenarios "Estado legible sin color" y "Prioridad y estado no se confunden": el estado dice
 * *cómo está* y la prioridad *cuándo actuar*; no son intercambiables.
 */
describe('UiStatus y UiPriority', () => {
  it('el estado se lee en su texto, sin depender del color', () => {
    const wrapper = mount(UiStatus, { props: { tone: 'warning' }, slots: { default: 'Revisar' } })

    expect(wrapper.text()).toBe('Revisar')
    expect(wrapper.classes()).toContain('status--warning')
  })

  it('la prioridad se lee en su texto, sin depender del color', () => {
    const wrapper = mount(UiPriority, { props: { level: 'soon' }, slots: { default: 'Atender pronto' } })

    expect(wrapper.text()).toBe('Atender pronto')
    expect(wrapper.classes()).toContain('priority--soon')
  })

  it('el estado no admite los valores de la prioridad', () => {
    expect(() => mount(UiStatus, { props: { tone: 'immediate' as never } })).toThrow(/estado/i)
  })

  it('la prioridad no admite los valores del estado', () => {
    expect(() => mount(UiPriority, { props: { level: 'warning' as never } })).toThrow(/prioridad/i)
  })
})

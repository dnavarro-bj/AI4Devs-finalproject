import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UiToastHost from '../app/components/ui/UiToastHost.vue'
import { useToast } from '../app/composables/useToast'

/** Escenarios "Confirmación anunciada" y "Confirmación efímera". */
describe('toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToast().clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('anuncia la confirmación como estado, sin robar el foco', async () => {
    const wrapper = mount(UiToastHost, { attachTo: document.body })
    const before = document.activeElement

    useToast().show('Lectura guardada')
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toContain('Lectura guardada')
    expect(document.activeElement).toBe(before)

    wrapper.unmount()
  })

  it('desaparece por sí solo', async () => {
    const wrapper = mount(UiToastHost)

    useToast().show('Lectura guardada')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Lectura guardada')

    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Lectura guardada')
  })
})

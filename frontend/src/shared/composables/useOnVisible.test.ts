import { describe, expect, it, vi, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useOnVisible } from './useOnVisible'

let trigger: (isIntersecting: boolean) => void = () => {}
const disconnect = vi.fn()

class FakeObserver {
  constructor(callback: (hits: Array<{ isIntersecting: boolean }>) => void) {
    trigger = (isIntersecting) => callback([{ isIntersecting }])
  }
  observe = vi.fn()
  disconnect = disconnect
}

function harness(callback: () => void) {
  return mount(
    defineComponent({
      setup() {
        const target = ref<HTMLElement | null>(null)
        useOnVisible(target, callback)
        return () => h('div', { ref: target })
      },
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  disconnect.mockClear()
})

describe('useOnVisible', () => {
  it('calls back each time the target enters the screen, and not when it leaves', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const callback = vi.fn()
    harness(callback)
    await nextTick()

    trigger(false)
    expect(callback).not.toHaveBeenCalled()
    trigger(true)
    trigger(true)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('stops observing when the component goes away', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const wrapper = harness(vi.fn())
    await nextTick()

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalled()
  })

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    expect(() => harness(vi.fn())).not.toThrow()
  })
})

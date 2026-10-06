import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useDebouncedRef } from './useDebouncedRef'

describe('useDebouncedRef', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('empieza con el valor de origen, sin esperar', () => {
    const source = ref('a')

    expect(useDebouncedRef(source, 200).value).toBe('a')
  })

  it('entrega el valor solo cuando se hace una pausa', async () => {
    const source = ref('')
    const debounced = useDebouncedRef(source, 200)

    source.value = 'g'
    await nextTick()
    vi.advanceTimersByTime(100)
    expect(debounced.value).toBe('')

    vi.advanceTimersByTime(100)
    expect(debounced.value).toBe('g')
  })

  it('los valores intermedios se descartan: solo llega el último', async () => {
    const source = ref('')
    const debounced = useDebouncedRef(source, 200)
    const seen: string[] = []
    // `flush: 'sync'` para ver cada cambio sin que Vue agrupe los de un mismo ciclo.
    const { watch } = await import('vue')
    watch(debounced, (value) => seen.push(value), { flush: 'sync' })

    for (const text of ['g', 'gr', 'gru', 'grus']) {
      source.value = text
      await nextTick()
      vi.advanceTimersByTime(50)
    }
    vi.advanceTimersByTime(200)

    expect(seen).toEqual(['grus'])
  })

  it('vaciar el origen también se entrega, tras la pausa', async () => {
    const source = ref('gruss')
    const debounced = useDebouncedRef(source, 200)

    source.value = ''
    await nextTick()
    vi.advanceTimersByTime(200)

    expect(debounced.value).toBe('')
  })
})

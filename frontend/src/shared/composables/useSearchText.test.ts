import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { useSearchText } from './useSearchText'

describe('useSearchText', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('aplica lo escrito tras una pausa, no por tecla', async () => {
    const state = reactive({ q: '' })
    const { text } = useSearchText(state, 100)

    for (const value of ['g', 'gr', 'gru']) {
      text.value = value
      await vi.advanceTimersByTimeAsync(30)
    }
    expect(state.q).toBe('')

    await vi.advanceTimersByTimeAsync(120)
    expect(state.q).toBe('gru')
  })

  it('recorta el texto aplicado', async () => {
    const state = reactive({ q: '' })
    const { text } = useSearchText(state, 100)

    text.value = '  suegra '
    await vi.advanceTimersByTimeAsync(150)

    expect(state.q).toBe('suegra')
  })

  it('empieza con el valor del estado', () => {
    const state = reactive({ q: 'de la URL' })

    expect(useSearchText(state).text.value).toBe('de la URL')
  })

  it('un cambio de fuera se vuelca a la caja', async () => {
    const state = reactive({ q: '' })
    const { text } = useSearchText(state, 100)

    state.q = 'otro'
    await vi.advanceTimersByTimeAsync(0)

    expect(text.value).toBe('otro')
  })

  it('quitar la búsqueda es inmediato', async () => {
    const state = reactive({ q: '' })
    const { text, clear } = useSearchText(state, 100)
    text.value = 'gruss'
    await vi.advanceTimersByTimeAsync(150)

    clear()

    expect(state.q).toBe('')
    expect(text.value).toBe('')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, nextTick } from 'vue'
import { useGlobalSearch } from '@features/search/composables/useGlobalSearch'
import { searchApiService } from '@features/search/services/search.api.service'
import type { SearchGroup } from '@features/search/types/search.types'
import { ok } from '@shared/types/api.types'

/**
 * Escenarios «Una respuesta tardía no pisa a la actual» y «Escribir deprisa no lanza una petición
 * por tecla». Se prueba el composable montado en un componente mínimo.
 */
describe('useGlobalSearch', () => {
  afterEach(() => vi.restoreAllMocks())

  const group = (label: string): SearchGroup[] => [{
    kind: 'plant', label: 'Plantas', results: [{ kind: 'plant', label, to: '/plants' }],
  }]

  async function mountSearch() {
    let api!: ReturnType<typeof useGlobalSearch>
    await mountSuspended(defineComponent({
      setup() {
        api = useGlobalSearch()
        return () => h('div')
      },
    }))
    return api
  }

  const pause = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

  it('escribir varias letras seguidas lanza una sola búsqueda', async () => {
    const search = vi.spyOn(searchApiService, 'search').mockResolvedValue(ok(group('CAT-GRUSS-01')))
    const api = await mountSearch()

    for (const text of ['g', 'gr', 'gru', 'grus', 'gruss']) {
      api.query.value = text
      await nextTick()
    }
    await pause()

    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('gruss')
  })

  it('una respuesta tardía de una búsqueda anterior no sustituye a la actual', async () => {
    let releaseSlow!: (value: ReturnType<typeof ok<SearchGroup[]>>) => void
    const search = vi.spyOn(searchApiService, 'search')
      .mockImplementationOnce(() => new Promise((resolve) => { releaseSlow = resolve }))
      .mockImplementationOnce(async () => ok(group('CAT-MAMMI-01')))
    const api = await mountSearch()

    api.query.value = 'gruss'
    await pause()
    api.query.value = 'mammi'
    await pause()
    // La primera, que era lenta, responde la última.
    releaseSlow(ok(group('CAT-GRUSS-01')))
    await pause(50)

    expect(search).toHaveBeenCalledTimes(2)
    expect(api.groups.value[0]!.results[0]!.label).toBe('CAT-MAMMI-01')
  })

  it('vaciar la caja limpia los resultados al instante', async () => {
    vi.spyOn(searchApiService, 'search').mockResolvedValue(ok(group('CAT-GRUSS-01')))
    const api = await mountSearch()
    api.query.value = 'gruss'
    await pause()
    expect(api.groups.value).toHaveLength(1)

    api.query.value = ''
    await nextTick()

    expect(api.groups.value).toEqual([])
  })

  it('una respuesta que llega después de vaciar la caja no la rellena', async () => {
    let release!: (value: ReturnType<typeof ok<SearchGroup[]>>) => void
    vi.spyOn(searchApiService, 'search').mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const api = await mountSearch()

    api.query.value = 'gruss'
    await pause()
    api.query.value = ''
    await nextTick()
    release(ok(group('CAT-GRUSS-01')))
    await pause(50)

    expect(api.groups.value).toEqual([])
  })
})

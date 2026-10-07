import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { searchApiService } from './search.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de «Búsqueda global sobre datos reales»: cuatro tipos reales del API, consultados en
 * paralelo con `q`, cada uno fallando por separado, y sin ningún dato de ejemplo.
 */
describe('searchApiService', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const page = <T>(content: T[], totalElements = content.length) => ({
    content, totalElements, totalPages: 1, pageNumber: 0, pageSize: 5,
  })

  const plant = {
    id: '895390874840660894', code: 'CAT-GRUSS-01', nickname: 'Asiento de suegra', createdAt: null,
    location: { id: '300001', name: 'Bandeja A3' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  }
  const species = { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }
  const location = { id: '300001', name: 'Invernadero 1', code: 'LOC-INV1', path: 'Invernadero 1', plantCount: 12 }
  const tag = { id: '400001', name: 'globular', plantCount: 87 }

  type Served = { plants?: unknown[], species?: unknown[], locations?: unknown[], tags?: unknown[], totals?: Record<string, number> }

  function serve(served: Served = {}) {
    api.get.mockImplementation(async (path: string) => {
      const totals = served.totals ?? {}
      if (path === '/plants') return page(served.plants ?? [], totals.plants)
      if (path === '/species') return page(served.species ?? [], totals.species)
      if (path === '/locations') return page(served.locations ?? [], totals.locations)
      if (path === '/tags') return page(served.tags ?? [], totals.tags)
      throw new Error(`ruta inesperada: ${path}`)
    })
  }

  const all = (result: Awaited<ReturnType<typeof searchApiService.search>>) =>
    result.data!.flatMap((group) => group.results)

  const group = (result: Awaited<ReturnType<typeof searchApiService.search>>, kind: string) =>
    result.data!.find((entry) => entry.kind === kind)

  it('pide el texto a los cuatro listados con `q` y un tamaño acotado, en paralelo', async () => {
    serve()

    await searchApiService.search('  gruss ')

    for (const path of ['/plants', '/species', '/locations', '/tags']) {
      expect(api.get).toHaveBeenCalledWith(path, expect.objectContaining({ q: 'gruss', size: 5 }))
    }
    expect(api.get).toHaveBeenCalledTimes(4)
  })

  it('no manda `code`: el texto se resuelve con `q`', async () => {
    serve()

    await searchApiService.search('gruss')

    for (const [, params] of api.get.mock.calls) expect(params).not.toHaveProperty('code')
  })

  it('encuentra una planta, con su código, su apodo y su ficha', async () => {
    serve({ plants: [plant] })

    const result = await searchApiService.search('suegra')

    expect(group(result, 'plant')!.label).toBe('Plantas')
    expect(group(result, 'plant')!.results[0]).toMatchObject({
      label: 'CAT-GRUSS-01',
      detail: expect.stringContaining('Asiento de suegra'),
      to: '/plants/895390874840660894',
    })
  })

  it('encuentra una especie, con su código, su nombre científico y su ficha', async () => {
    serve({ species: [species] })

    const result = await searchApiService.search('gruss')

    expect(group(result, 'species')!.results[0]).toMatchObject({
      label: 'CAT-GRUSS',
      detail: expect.stringContaining('Echinocactus grusonii'),
      to: '/species/200001',
    })
  })

  it('encuentra una localización real, con su código, y abre su ficha', async () => {
    serve({ locations: [location] })

    const result = await searchApiService.search('inver')

    expect(group(result, 'location')!.label).toBe('Localizaciones')
    expect(group(result, 'location')!.results[0]).toMatchObject({
      label: 'Invernadero 1',
      detail: expect.stringContaining('LOC-INV1'),
      to: '/locations/300001',
    })
  })

  it('encuentra una etiqueta real, con su recuento, y abre su ficha', async () => {
    serve({ tags: [tag] })

    const result = await searchApiService.search('glob')

    expect(group(result, 'tag')!.results[0]).toMatchObject({
      label: 'globular',
      detail: expect.stringContaining('87'),
      to: '/tags/400001',
    })
  })

  it('no devuelve nada que no venga del API: ni catálogo de ejemplo ni marca «ejemplo»', async () => {
    serve()

    const result = await searchApiService.search('invernadero')

    expect(result.data).toEqual([])
  })

  it('ningún resultado lleva la marca de ejemplo', async () => {
    serve({ plants: [plant], species: [species], locations: [location], tags: [tag] })

    const result = await searchApiService.search('a')

    expect(all(result).every((item) => !item.detail?.includes('ejemplo'))).toBe(true)
  })

  it('con más coincidencias de las mostradas, plantas y especies ofrecen «Ver los N resultados»', async () => {
    serve({
      plants: Array.from({ length: 5 }, (_, i) => ({ ...plant, id: String(i + 1), code: `CAT-GRUSS-0${i + 1}` })),
      species: [species],
      totals: { plants: 37, species: 12 },
    })

    const result = await searchApiService.search('gruss')

    expect(group(result, 'plant')!.more).toEqual({ label: 'Ver los 37 resultados', to: '/plants?q=gruss' })
    // Las especies muestran 1 de 12: también hay más.
    expect(group(result, 'species')!.more).toEqual({ label: 'Ver los 12 resultados', to: '/species?q=gruss' })
  })

  it('el texto del enlace «Ver todos» va codificado en la URL', async () => {
    serve({ plants: [plant], totals: { plants: 6 } })

    const result = await searchApiService.search('cat gruss&x')

    expect(group(result, 'plant')!.more!.to).toBe('/plants?q=cat%20gruss%26x')
  })

  it('si lo mostrado es todo lo que hay, no hay enlace', async () => {
    serve({ plants: [plant], species: [species] })

    const result = await searchApiService.search('gruss')

    expect(group(result, 'plant')!.more).toBeUndefined()
    expect(group(result, 'species')!.more).toBeUndefined()
  })

  it('localizaciones y etiquetas no ofrecen «Ver todos»: sus pantallas no se filtran por texto', async () => {
    serve({ locations: [location], tags: [tag], totals: { locations: 40, tags: 40 } })

    const result = await searchApiService.search('a')

    expect(group(result, 'location')!.more).toBeUndefined()
    expect(group(result, 'tag')!.more).toBeUndefined()
  })

  it('muestra pocos resultados por tipo: es un desplegable, no un listado', async () => {
    serve({ plants: Array.from({ length: 20 }, (_, i) => ({ ...plant, id: String(i + 1), code: `CAT-GRUSS-${i + 1}` })), totals: { plants: 20 } })

    const result = await searchApiService.search('gruss')

    expect(group(result, 'plant')!.results.length).toBeLessThanOrEqual(5)
  })

  it('un texto vacío no pide nada', async () => {
    const result = await searchApiService.search('   ')

    expect(result.data).toEqual([])
    expect(api.get).not.toHaveBeenCalled()
  })

  it('cada tipo falla por separado: si cae el de etiquetas, los demás se muestran', async () => {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/tags') throw new ApiError(500, 'caído')
      if (path === '/plants') return page([plant])
      if (path === '/species') return page([species])
      return page([location])
    })

    const result = await searchApiService.search('gruss')

    expect(result.success).toBe(true)
    const kinds = result.data!.map((entry) => entry.kind)
    expect(kinds).toEqual(['plant', 'species', 'location'])
    expect(kinds).not.toContain('tag')
  })

  it('si fallan los cuatro, no lanza: «sin resultados»', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'caído'))

    const result = await searchApiService.search('gruss')

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('los grupos salen por tipo y en el orden fijo, sin grupos vacíos', async () => {
    serve({ plants: [plant], tags: [tag] })

    const result = await searchApiService.search('gruss')

    expect(result.data!.map((entry) => entry.kind)).toEqual(['plant', 'tag'])
  })
})

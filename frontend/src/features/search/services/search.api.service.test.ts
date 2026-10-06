import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { searchApiService } from './search.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de «Búsqueda global de plantas y especies por código»: plantas y especies reales del
 * API; localizaciones y etiquetas, de ejemplo y marcadas.
 */
describe('searchApiService', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const page = <T>(content: T[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })

  const plant = { id: '895390874840660894', code: 'CAT-GRUSS-01', nickname: 'Grusonii de entrada', createdAt: null, location: { id: '300001', name: 'Bandeja A3' }, species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' } }
  const species = { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }

  function serve(plants: unknown[], speciesList: unknown[]) {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/plants') return page(plants)
      if (path === '/species') return page(speciesList)
      throw new Error(`ruta inesperada: ${path}`)
    })
  }

  const all = (result: Awaited<ReturnType<typeof searchApiService.search>>) =>
    result.data!.flatMap((group) => group.results)

  it('encuentra una planta por su código, con su apodo y su ficha', async () => {
    serve([plant], [])

    const result = await searchApiService.search('CAT-GRUSS-01')

    const group = result.data!.find((entry) => entry.kind === 'plant')!
    expect(group.label).toBe('Plantas')
    expect(group.results[0]).toMatchObject({
      label: 'CAT-GRUSS-01',
      detail: expect.stringContaining('Grusonii de entrada'),
      to: '/plants/895390874840660894',
    })
  })

  it('encuentra una especie por su código, con su nombre científico y su ficha', async () => {
    serve([], [species])

    const result = await searchApiService.search('gruss')

    const group = result.data!.find((entry) => entry.kind === 'species')!
    expect(group.results[0]).toMatchObject({
      label: 'CAT-GRUSS',
      detail: expect.stringContaining('Echinocactus grusonii'),
      to: '/species/200001',
    })
  })

  it('pide el código al API en los dos listados, en paralelo', async () => {
    serve([], [])

    await searchApiService.search('gruss')

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ code: 'gruss' }))
    expect(api.get).toHaveBeenCalledWith('/species', expect.objectContaining({ code: 'gruss' }))
  })

  it('los resultados de plantas y especies son los del API, no un catálogo de ejemplo', async () => {
    serve([], [])

    const result = await searchApiService.search('gruss')

    expect(all(result).filter((item) => ['plant', 'species'].includes(item.kind))).toEqual([])
  })

  it('muestra pocos resultados por tipo: es un desplegable, no un listado', async () => {
    serve(Array.from({ length: 20 }, (_, i) => ({ ...plant, id: String(i + 1), code: `CAT-GRUSS-${i + 1}` })), [])

    const result = await searchApiService.search('gruss')

    expect(result.data!.find((entry) => entry.kind === 'plant')!.results.length).toBeLessThanOrEqual(5)
  })

  it('las localizaciones y etiquetas siguen siendo ejemplo y lo dicen', async () => {
    serve([], [])

    const result = await searchApiService.search('invernadero')

    const examples = all(result).filter((item) => item.kind === 'location')
    expect(examples.length).toBeGreaterThan(0)
    expect(examples.every((item) => item.detail?.includes('ejemplo'))).toBe(true)
  })

  it('un texto vacío no pide nada', async () => {
    const result = await searchApiService.search('   ')

    expect(result.data).toEqual([])
    expect(api.get).not.toHaveBeenCalled()
  })

  it('si falla el API de plantas, las especies se siguen mostrando, sin lanzar', async () => {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/plants') throw new ApiError(500, 'caído')
      return page([species])
    })

    const result = await searchApiService.search('gruss')

    expect(result.success).toBe(true)
    const kinds = result.data!.map((group) => group.kind)
    expect(kinds).toContain('species')
    expect(kinds).not.toContain('plant')
  })

  it('si fallan los dos, devuelve lo que no depende del API sin romper', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'caído'))

    const result = await searchApiService.search('invernadero')

    expect(result.success).toBe(true)
    expect(result.data!.some((group) => group.kind === 'location')).toBe(true)
  })

  it('los grupos salen por tipo y en el orden fijo, sin grupos vacíos', async () => {
    serve([plant], [species])

    const result = await searchApiService.search('gruss')

    expect(result.data!.map((group) => group.kind)).toEqual(['plant', 'species'])
  })
})

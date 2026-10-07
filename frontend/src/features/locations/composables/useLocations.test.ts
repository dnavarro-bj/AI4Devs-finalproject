import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, fail, domainError, ErrorCodes } from '@shared/types/api.types'
import { locationsApiService } from '../services/locations.api.service'
import { useLocations } from './useLocations'

vi.mock('../services/locations.api.service', () => ({
  locationsApiService: { list: vi.fn(), detail: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), move: vi.fn(), movements: vi.fn(), plantMovements: vi.fn() },
}))

const service = vi.mocked(locationsApiService)
const row = (id: string) => ({ id, name: `Zona ${id}` }) as never
const page = (content: unknown[], pageNumber: number, totalPages: number) =>
  ok({ content, totalElements: 5, totalPages, pageNumber, pageSize: 2 }) as never

describe('useLocations', () => {
  beforeEach(() => vi.resetAllMocks())

  describe('loadAll', () => {
    it('recorre todas las páginas hasta agotarlas y las junta en orden', async () => {
      service.list
        .mockResolvedValueOnce(page([row('1'), row('2')], 0, 3))
        .mockResolvedValueOnce(page([row('3'), row('4')], 1, 3))
        .mockResolvedValueOnce(page([row('5')], 2, 3))

      const result = await useLocations().loadAll()

      expect(service.list).toHaveBeenCalledTimes(3)
      expect(service.list.mock.calls.map(([query]) => query?.page)).toEqual([0, 1, 2])
      expect(result.data!.map((location) => location.id)).toEqual(['1', '2', '3', '4', '5'])
    })

    it('un catálogo vacío es una lista vacía, no un error', async () => {
      service.list.mockResolvedValueOnce(page([], 0, 0))

      const result = await useLocations().loadAll()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('si una página falla, falla el conjunto: un mapa a medias engaña', async () => {
      service.list
        .mockResolvedValueOnce(page([row('1')], 0, 2))
        .mockResolvedValueOnce(fail(domainError(ErrorCodes.NETWORK_ERROR, 'sin red')))

      const result = await useLocations().loadAll()

      expect(result.success).toBe(false)
      expect(result.error!.message).toBe('sin red')
    })

    it('pide el orden por nombre para que las páginas sean estables', async () => {
      service.list.mockResolvedValueOnce(page([], 0, 0))

      await useLocations().loadAll()

      expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ sort: 'name' }))
    })
  })

  it('el resto de operaciones delegan en el service sin tocar su resultado', async () => {
    service.move.mockResolvedValue(ok({ moved: 3, unchanged: 0 }))
    service.remove.mockResolvedValue(ok(null))

    const { move, remove } = useLocations()

    expect((await move('9', ['1', '2', '3'])).data).toEqual({ moved: 3, unchanged: 0 })
    expect(service.move).toHaveBeenCalledWith('9', ['1', '2', '3'])
    expect((await remove('9')).success).toBe(true)
  })
})

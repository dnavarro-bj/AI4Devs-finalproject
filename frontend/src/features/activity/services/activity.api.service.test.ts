import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { activityApiService } from './activity.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

const page = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 8 }

describe('activityApiService', () => {
  beforeEach(() => { api.get.mockReset() })

  it('pide la actividad paginada con la página y el tamaño', async () => {
    api.get.mockResolvedValue(page)

    const result = await activityApiService.list({ page: 1, size: 8 })

    expect(api.get).toHaveBeenCalledWith('/activity', { page: 1, size: 8 })
    expect(result).toEqual({ success: true, data: page, error: null })
  })

  it('los criterios ausentes no viajan', async () => {
    api.get.mockResolvedValue(page)

    await activityApiService.list()

    expect(api.get).toHaveBeenCalledWith('/activity', { page: 0 })
  })

  it('un fallo del API viaja como valor, no se lanza', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'Sin actividad'))

    const result = await activityApiService.list()

    expect(result.success).toBe(false)
    expect(result.error).toMatchObject({ code: ErrorCodes.SERVER_ERROR })
  })
})

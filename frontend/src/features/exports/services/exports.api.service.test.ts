import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { exportsApiService } from './exports.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** El contrato del service de exportación: pide el CSV con la consulta del listado y **nunca lanza**. */
describe('exportsApiService', () => {
  beforeEach(() => { api.getBlob.mockReset() })

  const file = { blob: new Blob(['a']), filename: 'cactify-plantas-2026-10-07.csv' }

  it('pide las plantas con la consulta tal cual, sin transformarla', async () => {
    api.getBlob.mockResolvedValue(file)

    const result = await exportsApiService.export('plants', 'q=gruss&sort=species,asc&status=activa&status=cuarentena')

    expect(api.getBlob).toHaveBeenCalledWith('/plants/export?q=gruss&sort=species,asc&status=activa&status=cuarentena')
    expect(result.success).toBe(true)
    expect(result.data).toEqual(file)
  })

  it('pide las especies a su propia ruta', async () => {
    api.getBlob.mockResolvedValue(file)

    await exportsApiService.export('species', 'minTemperatureFrom=9')

    expect(api.getBlob).toHaveBeenCalledWith('/species/export?minTemperatureFrom=9')
  })

  it('sin criterios no añade el signo de interrogación', async () => {
    api.getBlob.mockResolvedValue(file)

    await exportsApiService.export('plants', '')

    expect(api.getBlob).toHaveBeenCalledWith('/plants/export')
  })

  it('el exceso de filas llega como error con el mensaje del servidor, sin lanzar', async () => {
    api.getBlob.mockRejectedValue(new ApiError(422, '1200 filas superan el máximo de 1000: afina los filtros'))

    const result = await exportsApiService.export('plants', 'status=activa')

    expect(result.success).toBe(false)
    expect(result.error).toMatchObject({
      message: '1200 filas superan el máximo de 1000: afina los filtros',
      status: 422,
      code: ErrorCodes.VALIDATION_ERROR,
    })
  })

  it('un fallo de red es un error como valor', async () => {
    api.getBlob.mockRejectedValue(new ApiError(0, 'sin red'))

    const result = await exportsApiService.export('species', '')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.NETWORK_ERROR)
  })
})

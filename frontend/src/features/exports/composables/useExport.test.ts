import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from '@shared/utils/downloadBlob'
import { useToast } from '@shared/composables/useToast'
import { fail, ok, domainError } from '@shared/types/api.types'
import { exportsApiService } from '../services/exports.api.service'
import { useExport } from './useExport'

vi.mock('@shared/utils/downloadBlob', () => ({ downloadBlob: vi.fn() }))

/**
 * El caso de uso de exportar desde una pantalla de listado: una exportación en vuelo a la vez,
 * descarga y aviso al terminar, y el error del servidor tal cual, sin perder nada de la pantalla.
 */
describe('useExport', () => {
  const file = { blob: new Blob(['a']), filename: 'cactify-plantas-2026-10-07.csv' }

  beforeEach(() => {
    vi.mocked(downloadBlob).mockReset()
    useToast().clear()
  })
  afterEach(() => vi.restoreAllMocks())

  it('pide la exportación del tipo con la consulta y descarga el archivo con el nombre del servidor', async () => {
    const service = vi.spyOn(exportsApiService, 'export').mockResolvedValue(ok(file))
    const exporter = useExport('plants')

    await exporter.run('q=gruss&status=activa')

    expect(service).toHaveBeenCalledWith('plants', 'q=gruss&status=activa')
    expect(downloadBlob).toHaveBeenCalledWith(file.blob, 'cactify-plantas-2026-10-07.csv')
    expect(exporter.error.value).toBeNull()
  })

  it('confirma con un aviso lo ya ocurrido', async () => {
    vi.spyOn(exportsApiService, 'export').mockResolvedValue(ok(file))
    const exporter = useExport('plants')

    await exporter.run('')

    expect(useToast().toasts.value.map((toast) => toast.message)).toEqual([
      'Exportación lista: cactify-plantas-2026-10-07.csv',
    ])
  })

  it('si el servidor no fija nombre, descarga con uno por defecto del tipo', async () => {
    vi.spyOn(exportsApiService, 'export').mockResolvedValue(ok({ blob: file.blob, filename: null }))

    await useExport('plants').run('')
    await useExport('species').run('')

    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[1])).toEqual(['cactify-plantas.csv', 'cactify-especies.csv'])
  })

  it('mientras exporta lo indica, y solo hay una exportación en vuelo', async () => {
    let release!: (value: ReturnType<typeof ok<typeof file>>) => void
    const service = vi.spyOn(exportsApiService, 'export').mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const exporter = useExport('plants')

    const first = exporter.run('status=activa')
    expect(exporter.exporting.value).toBe(true)
    await exporter.run('status=activa')

    expect(service).toHaveBeenCalledTimes(1)
    release(ok(file))
    await first
    expect(exporter.exporting.value).toBe(false)
    expect(downloadBlob).toHaveBeenCalledTimes(1)
  })

  it('un error del servidor se muestra con su mensaje, sin descargar ni avisar', async () => {
    vi.spyOn(exportsApiService, 'export').mockResolvedValue(
      fail(domainError('VALIDATION_ERROR', '1200 filas superan el máximo de 1000: afina los filtros', 422)),
    )
    const exporter = useExport('plants')

    await exporter.run('status=activa')

    expect(exporter.error.value).toBe('1200 filas superan el máximo de 1000: afina los filtros')
    expect(exporter.exporting.value).toBe(false)
    expect(downloadBlob).not.toHaveBeenCalled()
    expect(useToast().toasts.value).toHaveLength(0)
  })

  it('un intento posterior que sale bien limpia el error anterior', async () => {
    const service = vi.spyOn(exportsApiService, 'export')
      .mockResolvedValueOnce(fail(domainError('VALIDATION_ERROR', 'demasiadas filas', 422)))
      .mockResolvedValueOnce(ok(file))
    const exporter = useExport('plants')

    await exporter.run('')
    expect(exporter.error.value).toBe('demasiadas filas')
    await exporter.run('status=activa')

    expect(service).toHaveBeenCalledTimes(2)
    expect(exporter.error.value).toBeNull()
  })

  it('el error se puede descartar', async () => {
    vi.spyOn(exportsApiService, 'export').mockResolvedValue(fail(domainError('NETWORK_ERROR', 'sin red', 0)))
    const exporter = useExport('species')
    await exporter.run('')

    exporter.clearError()

    expect(exporter.error.value).toBeNull()
  })
})

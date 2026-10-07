import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, fail } from '@shared/types/api.types'
import { useToast } from '@shared/composables/useToast'

const service = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), create: vi.fn(), transition: vi.fn() }))
vi.mock('../services/alerts.api.service', () => ({ alertsApiService: service }))

import { useAlertActions } from './useAlertActions'

describe('useAlertActions', () => {
  beforeEach(() => Object.values(service).forEach((fn) => fn.mockReset()))

  it('resolver manda el comentario, devuelve la alerta y lo dice', async () => {
    service.transition.mockResolvedValue(ok({ id: '1', status: 'resuelta' }))
    const actions = useAlertActions()

    const result = await actions.transition('1', 'resolve', 'Cambiada de sitio')

    expect(service.transition).toHaveBeenCalledWith('1', 'resolve', 'Cambiada de sitio')
    expect(result).toMatchObject({ status: 'resuelta' })
    expect(useToast().toasts.value.at(-1)!.message).toBe('Alerta resuelta')
  })

  it('descartar se anuncia como descartar, no como resolver', async () => {
    service.transition.mockResolvedValue(ok({ id: '1', status: 'descartada' }))

    await useAlertActions().transition('1', 'dismiss')

    expect(useToast().toasts.value.at(-1)!.message).toBe('Alerta descartada')
  })

  it('un error queda en el estado y no se pierde en un toast', async () => {
    service.transition.mockResolvedValue(fail({ code: 'CONFLICT', message: 'La alerta ya está cerrada', status: 409 }))
    const actions = useAlertActions()

    const result = await actions.transition('1', 'resolve', 'Texto')

    expect(result).toBeNull()
    expect(actions.error.value).toBe('La alerta ya está cerrada')
    expect(actions.submitting.value).toBe(false)
  })

  it('anota una incidencia y la devuelve', async () => {
    service.create.mockResolvedValue(ok({ id: '2', source: 'manual' }))
    const actions = useAlertActions()

    const result = await actions.create({ plantId: '5', category: 'otra', severity: 'media', reason: 'Cochinilla' })

    expect(result).toMatchObject({ id: '2' })
    expect(useToast().toasts.value.at(-1)!.message).toBe('Alerta anotada')
  })

  it('un error al anotar se queda en el estado', async () => {
    service.create.mockResolvedValue(fail({ code: 'VALIDATION_ERROR', message: 'El motivo es obligatorio', status: 400 }))
    const actions = useAlertActions()

    expect(await actions.create({ plantId: '5', category: 'otra', severity: 'media', reason: '' })).toBeNull()
    expect(actions.error.value).toBe('El motivo es obligatorio')
    actions.reset()
    expect(actions.error.value).toBeNull()
  })
})

/**
 * DOBLE DEL API DE ALERTAS PARA LOS TESTS DE PANTALLA.
 *
 * Un **servidor en memoria** con la forma del contrato del API (`alertas-con-ciclo-de-vida`):
 * filtrar, ordenar como la bandeja (severidad y última detección), paginar, revisar, resolver y
 * descartar cambian de verdad lo que el listado devuelve después, y una transición no admitida
 * responde `409` como el servidor. Vive solo aquí, fuera de `src/`: ningún código de producción lo
 * importa. `installAlertsFake()` lo instala sobre `alertsApiService` con `vi.spyOn`, así que
 * `vi.restoreAllMocks()` lo desinstala.
 */
import { vi } from 'vitest'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { domainError, ErrorCodes, fail, ok, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import { isOpen, type Alert, type AlertInput, type AlertListQuery, type AlertTransitionAction } from '@features/alerts/types/alert.types'

const RANK = { critica: 3, media: 2, baja: 1 } as const
const NEXT = { review: 'revisada', resolve: 'resuelta', dismiss: 'descartada' } as const

let store: Alert[] = []
let sequence = 1000
let now = '2026-10-07T09:00:00Z'

export const plantSubject = (code = 'CAT-FEROC-08', species = 'Ferocactus gracilis', id = '5') => ({
  id, code, nickname: `Planta ${id}`, speciesName: species, locationName: 'B1', locationPath: 'Invernadero 2 / B1',
})

export function makeAlert(over: Partial<Alert> = {}): Alert {
  const id = over.id ?? String(++sequence)
  return {
    id, source: 'medicion', category: 'temperatura', severity: 'media', status: 'nueva',
    reason: 'Temperatura fuera del rango efectivo',
    detectedAt: '2026-10-06T08:00:00Z', lastDetectedAt: '2026-10-06T08:00:00Z', occurrences: 1,
    plant: plantSubject(),
    ...over,
  }
}

export function resetAlertsFake(alerts: Alert[] = [], at = '2026-10-07T09:00:00Z') {
  store = alerts.map((alert) => ({ ...alert }))
  now = at
}

export const storedAlerts = () => store

function matches(alert: Alert, query: AlertListQuery): boolean {
  return (!query.status?.length || query.status.includes(alert.status))
    && (!query.severity?.length || query.severity.includes(alert.severity))
    && (!query.source || alert.source === query.source)
    && (!query.category || alert.category === query.category)
    && (!query.plant || alert.plant?.id === query.plant)
    && (!query.location || alert.location?.id === query.location || alert.plant?.locationPath.includes(query.location))
}

const byBandeja = (a: Alert, b: Alert) =>
  RANK[b.severity] - RANK[a.severity] || b.lastDetectedAt.localeCompare(a.lastDetectedAt) || b.id.localeCompare(a.id)

function page<T>(content: T[], number: number, size: number, total: number): PageResponse<T> {
  return { content, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)), pageNumber: number, pageSize: size }
}

export const alertsFakeService = {
  async list(query: AlertListQuery = {}): Promise<ServiceResponse<PageResponse<Alert>>> {
    const size = query.size ?? 25
    const number = query.page ?? 0
    const found = store.filter((alert) => matches(alert, query)).sort(byBandeja)
    return ok(page(found.slice(number * size, (number + 1) * size).map((alert) => ({ ...alert })), number, size, found.length))
  },

  async detail(id: string): Promise<ServiceResponse<Alert>> {
    const alert = store.find((candidate) => candidate.id === id)
    return alert ? ok({ ...alert }) : fail(domainError(ErrorCodes.NOT_FOUND, `La alerta '${id}' no existe`, 404))
  },

  async create(input: AlertInput): Promise<ServiceResponse<Alert>> {
    if (!input.reason.trim()) return fail(domainError(ErrorCodes.VALIDATION_ERROR, 'El motivo es obligatorio', 400))
    const created = makeAlert({
      source: 'manual', category: input.category, severity: input.severity, reason: input.reason.trim(),
      recommendedAction: input.recommendedAction, detectedAt: now, lastDetectedAt: now,
      plant: input.plantId ? plantSubject('CAT-NEW-01', 'Especie', input.plantId) : null,
      location: input.locationId ? { id: input.locationId, name: 'Zona', path: 'Zona' } : null,
    })
    store.push(created)
    return ok({ ...created })
  },

  async transition(id: string, action: AlertTransitionAction, comment?: string): Promise<ServiceResponse<Alert>> {
    const alert = store.find((candidate) => candidate.id === id)
    if (!alert) return fail(domainError(ErrorCodes.NOT_FOUND, `La alerta '${id}' no existe`, 404))
    const invalid = !isOpen(alert.status) || (action === 'review' && alert.status !== 'nueva')
    if (invalid) return fail(domainError(ErrorCodes.CONFLICT, `La alerta '${id}' no admite pasar a ${NEXT[action]}`, 409))

    alert.status = NEXT[action]
    if (action !== 'review') {
      alert.closedAt = now
      alert.resolutionComment = comment?.trim() || null
      if (action === 'resolve') alert.resolvedAt = now
    }
    return ok({ ...alert })
  },
}

export function installAlertsFake() {
  vi.spyOn(alertsApiService, 'list').mockImplementation(alertsFakeService.list)
  vi.spyOn(alertsApiService, 'detail').mockImplementation(alertsFakeService.detail)
  vi.spyOn(alertsApiService, 'create').mockImplementation(alertsFakeService.create)
  vi.spyOn(alertsApiService, 'transition').mockImplementation(alertsFakeService.transition)
}

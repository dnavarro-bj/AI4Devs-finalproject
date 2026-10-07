import type { PageResponse, ServiceResponse } from '@shared/types/api.types'

/**
 * El modelo de alertas del API (`alertas-con-ciclo-de-vida`): lo que viaja, tal cual. Los valores
 * son los del API y se muestran con **etiquetas**; no hay un segundo vocabulario.
 *
 * Una alerta no es una tarea ni un cuidado: señala un riesgo, y se cierra siempre por una persona.
 * Todo identificador es `string` (ADR-008).
 */

export type AlertSeverity = 'baja' | 'media' | 'critica'

/** El ciclo de vida del §17: `Nueva → Revisada → Resuelta | Descartada`. */
export type AlertStatus = 'nueva' | 'revisada' | 'resuelta' | 'descartada'

export type AlertSource = 'medicion' | 'sin_revisar' | 'cuidado_vencido' | 'manual' | 'recomendacion_ia'

export type AlertCategory = 'temperatura' | 'humedad' | 'luz' | 'riego' | 'seguimiento' | 'otra'

export interface AlertPlant {
  id: string
  code: string
  nickname: string
  speciesName: string
  locationName: string
  locationPath: string
}

export interface AlertLocation {
  id: string
  name: string
  path: string
}

export interface AlertTransition {
  from?: AlertStatus | null
  to: AlertStatus
  comment?: string | null
  occurredAt: string
}

export interface AlertTask {
  id: string
  title: string
  status: string
  dueFrom: string
  dueTo: string
}

export interface Alert {
  id: string
  source: AlertSource
  category: AlertCategory
  severity: AlertSeverity
  status: AlertStatus
  reason: string
  recommendedAction?: string | null
  /** La primera detección. */
  detectedAt: string
  /** La última: es la que se muestra. */
  lastDetectedAt: string
  occurrences: number
  resolvedAt?: string | null
  resolutionComment?: string | null
  closedAt?: string | null
  careRecordId?: string | null
  plant?: AlertPlant | null
  location?: AlertLocation | null
  /** Solo en el detalle. */
  transitions?: AlertTransition[]
  tasks?: AlertTask[]
}

/** Lo que la ficha del ejemplar trae de cada alerta abierta, de la más grave a la más leve. */
export type AlertSummary = Pick<
  Alert,
  'id' | 'source' | 'category' | 'severity' | 'status' | 'reason' | 'recommendedAction' | 'lastDetectedAt' | 'occurrences'
>

/** Las alertas abiertas de una localización —con las de lo que contiene— y la más grave de ellas. */
export interface OpenAlerts {
  count: number
  highestSeverity?: AlertSeverity | null
}

/** Los criterios del listado, con la convención de ADR-016: repetible es «cualquiera de los valores». */
export interface AlertListQuery {
  page?: number
  size?: number
  sort?: string
  status?: string[]
  severity?: string[]
  source?: string
  category?: string
  plant?: string
  location?: string
  includeDescendants?: boolean
}

/** Una incidencia anotada a mano: sobre una planta o sobre una localización, nunca las dos. */
export interface AlertInput {
  plantId?: string
  locationId?: string
  category: AlertCategory
  severity: AlertSeverity
  reason: string
  recommendedAction?: string
}

export type AlertTransitionAction = 'review' | 'resolve' | 'dismiss'

export interface AlertsApi {
  list(query?: AlertListQuery): Promise<ServiceResponse<PageResponse<Alert>>>
  detail(id: string): Promise<ServiceResponse<Alert>>
  create(input: AlertInput): Promise<ServiceResponse<Alert>>
  transition(id: string, action: AlertTransitionAction, comment?: string): Promise<ServiceResponse<Alert>>
}

export const ALERT_SEVERITIES: AlertSeverity[] = ['critica', 'media', 'baja']
export const ALERT_STATUSES: AlertStatus[] = ['nueva', 'revisada', 'resuelta', 'descartada']
export const ALERT_SOURCES: AlertSource[] = ['medicion', 'sin_revisar', 'cuidado_vencido', 'manual', 'recomendacion_ia']
export const ALERT_CATEGORIES: AlertCategory[] = ['temperatura', 'humedad', 'luz', 'riego', 'seguimiento', 'otra']

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critica: 'Crítica',
  media: 'Media',
  baja: 'Baja',
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  nueva: 'Nueva',
  revisada: 'Revisada',
  resuelta: 'Resuelta',
  descartada: 'Descartada',
}

export const ALERT_SOURCE_LABELS: Record<AlertSource, string> = {
  medicion: 'Medición fuera de rango',
  sin_revisar: 'Sin revisar',
  cuidado_vencido: 'Cuidado vencido',
  manual: 'Anotada a mano',
  recomendacion_ia: 'Recomendación de IA',
}

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  luz: 'Luz',
  riego: 'Riego',
  seguimiento: 'Seguimiento',
  otra: 'Otra',
}

/** Las abiertas son las que todavía piden atención. */
export const isOpen = (status: AlertStatus): boolean => status === 'nueva' || status === 'revisada'

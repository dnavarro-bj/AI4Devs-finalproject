/**
 * El modelo de la maqueta de alertas. **Provisional**: la pregunta 10 del §24 —qué eventos generan
 * alertas automáticamente— sigue abierta, y T-23 la decide.
 *
 * Una alerta no es una tarea: es una incidencia que requiere atención, con su propio ciclo de
 * vida. Crear una tarea desde una alerta no la resuelve.
 */

export type AlertSeverity = 'critical' | 'medium' | 'low'

/** El ciclo de vida del §17: `Nueva → Revisada → Resuelta | Descartada`. */
export type AlertState = 'new' | 'reviewed' | 'resolved' | 'dismissed'

export interface Alert {
  id: string
  /** Qué mide: «Temperatura», «Humedad», «Seguimiento». */
  kind: string
  severity: AlertSeverity
  state: AlertState
  title: string
  plantId: string
  plantCode: string
  speciesName: string
  location: string
  /** Cuándo se detectó, ya dicho: «Hace 32 min». */
  detected: string
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Crítica',
  medium: 'Media',
  low: 'Baja',
}

export const ALERT_STATE_LABELS: Record<AlertState, string> = {
  new: 'Nueva',
  reviewed: 'Revisada',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
}

/** Las abiertas son las que todavía piden atención. */
export const isOpen = (state: AlertState): boolean => state === 'new' || state === 'reviewed'

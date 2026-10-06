/**
 * Los ajustes de la maqueta, por ámbito. **Provisional y sin ticket**: ningún ticket del backlog
 * recoge la configuración por ámbitos (§20). Los ámbitos y campos son los del prototipo.
 */

export type SettingsScope = 'collection' | 'codes' | 'alerts' | 'ai' | 'access'

export interface SettingsValues {
  collection: {
    name: string
    timezone: string
    language: string
    temperatureUnit: string
    volumeUnit: string
    reviewDays: string
    weekStart: string
  }
  codes: {
    prefix: string
    digits: string
    separator: string
    labelSize: string
    labelContent: string
  }
  alerts: {
    staleDays: string
    staleOn: boolean
    overdueDays: string
    overdueOn: boolean
    temperatureHours: string
    temperatureOn: boolean
    dailyDigest: boolean
    criticalMail: boolean
    overdueMail: boolean
  }
  ai: {
    model: string
    usage: string
  }
}

export const SETTINGS_SCOPES: { value: SettingsScope, label: string, description: string }[] = [
  { value: 'collection', label: 'Colección', description: 'Nombre, unidades y revisiones' },
  { value: 'codes', label: 'Códigos', description: 'Prefijos y numeración' },
  { value: 'alerts', label: 'Alertas y avisos', description: 'Umbrales y notificaciones' },
  { value: 'ai', label: 'Inteligencia artificial', description: 'Proveedor y privacidad' },
  { value: 'access', label: 'Usuarios y acceso', description: 'Preparado para multiusuario' },
]

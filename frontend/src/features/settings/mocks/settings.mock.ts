/**
 * DATOS DE EJEMPLO — SIN TICKET QUE LOS SUSTITUYA TODAVÍA.
 *
 * Ningún ticket del backlog recoge la configuración por ámbitos. Estos son los valores del
 * prototipo; **no son la configuración real del sistema** —ni el prefijo de los códigos ni el
 * proveedor de IA— y la pantalla no los lee de ninguna parte ni los escribe en ninguna.
 *
 * Nadie más debe importarlo: solo el composable de `settings`, que los usa de valor inicial.
 */
import type { SettingsValues } from '../types/settings.types'

export const SETTINGS_MOCK: SettingsValues = {
  collection: {
    name: 'Vivero privado',
    timezone: 'Europe/Madrid',
    language: 'es',
    temperatureUnit: 'c',
    volumeUnit: 'ml',
    reviewDays: '14',
    weekStart: 'monday',
  },
  codes: { prefix: 'CAT', digits: '2', separator: '-', labelSize: '50x20', labelContent: 'full' },
  alerts: {
    staleDays: '30', staleOn: true,
    overdueDays: '2', overdueOn: true,
    temperatureHours: '2', temperatureOn: true,
    dailyDigest: true, criticalMail: true, overdueMail: false,
  },
  ai: { model: 'recommended', usage: 'on-demand' },
}

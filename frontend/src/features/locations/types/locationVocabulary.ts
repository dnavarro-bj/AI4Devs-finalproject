import type { LocationEnvironment, LocationExposure, LocationType } from './location.types'

/** El vocabulario cerrado del API, con la etiqueta que ve el usuario. Se escribe una sola vez. */
export const LOCATION_TYPES: LocationType[] = [
  'invernadero', 'bancada', 'bandeja', 'zona_exterior', 'estanteria', 'otro',
]

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  invernadero: 'Invernadero',
  bancada: 'Bancada',
  bandeja: 'Bandeja',
  zona_exterior: 'Zona exterior',
  estanteria: 'Estantería',
  otro: 'Otro',
}

/** El símbolo de cada tipo en el mapa y en las tarjetas; `⌖` para lo que no tiene tipo. */
export const LOCATION_TYPE_MARKS: Record<LocationType, string> = {
  invernadero: '⌂',
  bancada: '═',
  bandeja: '▦',
  zona_exterior: '☼',
  estanteria: '▤',
  otro: '⌖',
}

export const LOCATION_ENVIRONMENTS: LocationEnvironment[] = ['interior', 'cubierto', 'exterior']

export const LOCATION_ENVIRONMENT_LABELS: Record<LocationEnvironment, string> = {
  interior: 'Interior',
  cubierto: 'Cubierto',
  exterior: 'Exterior',
}

export const LOCATION_EXPOSURES: LocationExposure[] = ['sombra', 'semisombra', 'soleado', 'pleno_sol']

export const LOCATION_EXPOSURE_LABELS: Record<LocationExposure, string> = {
  sombra: 'Sombra',
  semisombra: 'Semisombra',
  soleado: 'Soleado',
  pleno_sol: 'Pleno sol',
}

export const LOCATION_EXPOSURE_MARKS: Record<LocationExposure, string> = {
  sombra: '◑',
  semisombra: '◐',
  soleado: '◒',
  pleno_sol: '☼',
}

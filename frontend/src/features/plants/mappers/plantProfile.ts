import type { PlantOrigin, PlantProfile, PlantStatus } from '../types/plant.types'

/**
 * Lo que la interfaz sabe del perfil de un ejemplar: los estados, sus textos, qué transiciones
 * ofrecer y cómo contar la germinación.
 *
 * `allowedTransitions` **espeja** la regla del dominio —`PlantStatus.canMoveTo` en el backend—: entre
 * estados en curso, libres; de uno en curso a uno final, libre; de uno final solo se vuelve a
 * `activa`. Es una regla de siete valores y pedirla al API sería una ronda más por abrir un diálogo;
 * el servidor la vuelve a comprobar y su `409` manda, así que si alguna vez divergieran el usuario
 * vería el motivo, no un fallo mudo.
 */

export const PLANT_STATUSES: PlantStatus[] = [
  'activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida',
]

export const STATUS_LABELS: Record<PlantStatus, string> = {
  activa: 'Activa',
  cuarentena: 'En cuarentena',
  enferma: 'Enferma',
  cedida: 'Cedida',
  vendida: 'Vendida',
  muerta: 'Muerta',
  perdida: 'Perdida',
}

const FINAL: PlantStatus[] = ['cedida', 'vendida', 'muerta', 'perdida']

/** Un estado final **no** hace desaparecer el ejemplar: lo saca del inventario por defecto. */
export const isFinalStatus = (status: PlantStatus): boolean => FINAL.includes(status)

/** Los estados que se pueden elegir al **dar de alta**: un ejemplar nace en curso. */
export const INITIAL_STATUSES: PlantStatus[] = PLANT_STATUSES.filter((status) => !isFinalStatus(status))

export function allowedTransitions(from: PlantStatus): PlantStatus[] {
  if (isFinalStatus(from)) return ['activa']
  return PLANT_STATUSES.filter((status) => status !== from)
}

/** Volver a `activa` desde un estado final es una corrección: exige motivo. */
export const reasonRequired = (from: PlantStatus, to: PlantStatus): boolean =>
  isFinalStatus(from) && to === 'activa'

export const ORIGIN_LABELS: Record<PlantOrigin, string> = {
  vivero: 'Vivero',
  intercambio: 'Intercambio',
  germinacion_propia: 'Germinación propia',
  compra: 'Compra',
  regalo: 'Regalo',
  otro: 'Otro',
}

export const ORIGINS = Object.keys(ORIGIN_LABELS) as PlantOrigin[]

/**
 * La germinación contada sin inventar nada: con mes, «Germinada 04/2021»; con solo el año, «Germinada
 * en 2021 · ~5 años». Nunca se muestra un mes que no se conoce, y sin año no hay germinación.
 * `currentYear` entra por parámetro: este módulo no consulta el reloj.
 */
export function germinationLabel(
  year: number | null | undefined,
  month: number | null | undefined,
  currentYear: number,
): string | null {
  if (year === null || year === undefined) return null
  if (month !== null && month !== undefined) return `Germinada ${String(month).padStart(2, '0')}/${year}`

  const age = currentYear - year
  if (age < 0) return `Germinada en ${year}`
  if (age === 0) return `Germinada en ${year} · este año`
  return `Germinada en ${year} · ~${age} ${age === 1 ? 'año' : 'años'}`
}

/** Los campos de la ficha tal y como los guarda el formulario: todos texto. */
export interface ProfileFields {
  description: string
  germinationYear: string
  germinationMonth: string
  acquiredOn: string
  origin: string
  originNote: string
}

/**
 * Del formulario al API: recorta los textos, convierte año y mes en números y **omite lo vacío**.
 * Un mes sin año se descarta —no significa nada, y el servidor lo rechazaría—, así que nunca viaja
 * un mes que no se conoce.
 */
export function toProfile(fields: ProfileFields): PlantProfile {
  const text = (value: string) => value.trim() || undefined
  const year = fields.germinationYear.trim() ? Number(fields.germinationYear) : undefined
  const month = year !== undefined && fields.germinationMonth.trim() ? Number(fields.germinationMonth) : undefined

  return Object.fromEntries(Object.entries({
    description: text(fields.description),
    germinationYear: year,
    germinationMonth: month,
    acquiredOn: text(fields.acquiredOn),
    origin: (text(fields.origin) as PlantOrigin | undefined),
    originNote: text(fields.originNote),
  }).filter(([, value]) => value !== undefined)) as PlantProfile
}

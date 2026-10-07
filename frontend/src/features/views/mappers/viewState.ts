import { canonicalQuery, parseQuery, type CanonicalInput } from '@shared/utils/canonicalQuery'
import type { SavedView, ViewDraft } from '../types/view.types'

/**
 * Entre el estado de una pantalla y lo que se guarda en una vista.
 *
 * Una vista habla el lenguaje **del API** (ADR-016): lo que solo existe en la pantalla —las columnas
 * ocultas (`hide`) y el pseudo-valor `status=all`— se traduce al guardar y se deshace al aplicar, y
 * nunca entra en la consulta ni en la comparación de «vista aplicada».
 */

type Raw = string | string[] | null | undefined
type RouteQuery = Record<string, Raw>

/** Lo que la pantalla de plantas sabe de sí misma y la vista no: sus estados y sus columnas. */
export interface PlantsContext {
  /** Todos los estados posibles de un ejemplar. */
  statuses: string[]
  /** Las columnas que se pueden ocultar: la identificativa no cuenta. */
  hideable: string[]
}

const list = (raw: Raw): string[] => (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((value) => value !== '')

/** El estado del inventario → lo que se guarda: consulta canónica en lenguaje del API y columnas visibles. */
export function plantsDraft(state: RouteQuery, context: PlantsContext): ViewDraft {
  const { hide, status, ...rest } = state
  const hidden = list(hide)

  const statuses = list(status).flatMap((value) => (value === 'all' ? context.statuses : [value]))

  return {
    query: canonicalQuery({ ...rest, status: statuses }),
    columns: context.hideable.filter((column) => !hidden.includes(column)),
  }
}

/** Una vista → el estado que la pantalla de plantas escribe en su URL. */
export function plantsRouteQuery(view: SavedView, context: PlantsContext): Record<string, string[]> {
  const params = parseQuery(view.query)

  const statuses = params.status
  if (statuses?.length) {
    const everything = context.statuses.every((status) => statuses.includes(status))
    // Una pantalla de un solo estado no puede mostrar «varios pero no todos»: se queda con el primero.
    params.status = everything ? ['all'] : [statuses[0]!]
  }

  if (view.columns) {
    params.hide = context.hideable.filter((column) => !view.columns!.includes(column))
  }
  return params
}

/** El estado del catálogo de especies → lo que se guarda: su consulta canónica, sin columnas. */
export const speciesDraft = (state: RouteQuery): ViewDraft => ({ query: canonicalQuery(state) })

/** Un grupo → el estado que la pantalla de especies escribe en su URL. */
export const speciesRouteQuery = (view: SavedView): Record<string, string[]> => parseQuery(view.query)

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((item) => b.includes(item))

/**
 * ¿El estado de la pantalla **es** esta vista? La consulta se compara en su forma canónica y las
 * columnas como conjunto; una vista sin columnas no tiene opinión sobre ellas.
 */
export function sameDraft(draft: ViewDraft, view: Pick<SavedView, 'query' | 'columns'>): boolean {
  if (canonicalQuery(draft.query) !== canonicalQuery(view.query)) return false
  if (!view.columns || !draft.columns) return true
  return sameSet(draft.columns, view.columns)
}

const SUNNY = ['pleno_sol', 'soleado']
const SHADY = ['sombra', 'semisombra']

/**
 * El símbolo de un grupo se **deriva** de su regla en vez de guardarse: el sol para una exposición
 * soleada, la media luna para la sombra y uno neutro para el resto. Así un grupo no necesita un
 * campo más ni la pantalla un selector de iconos.
 */
export function groupSymbol(query: CanonicalInput): string {
  const exposure = parseQuery(query).exposure ?? []
  if (exposure.length === 1 && SUNNY.includes(exposure[0]!)) return '☼'
  if (exposure.length === 1 && SHADY.includes(exposure[0]!)) return '◐'
  return '◇'
}

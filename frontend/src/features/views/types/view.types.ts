/** Una vista guardada: una consulta con nombre sobre el listado de su ámbito. */

export type ViewScope = 'plants' | 'species'

export interface SavedView {
  id: string
  scope: ViewScope
  name: string
  /** La *query string* canónica del listado, en el lenguaje del API (ADR-016), sin paginación. */
  query: string
  /** Solo en `plants`: las columnas **visibles**. Ausente = las que haya por defecto. */
  columns?: string[]
  /** Solo en `species`: cuántas especies cumplen hoy la regla del grupo. */
  matchCount?: number
  createdAt: string
  updatedAt: string
}

/** El cuerpo de alta y de reemplazo (`PUT` es reemplazo completo). */
export interface SavedViewInput {
  scope: ViewScope
  name: string
  query: string
  columns?: string[]
}

/** El estado de una pantalla traducido a lo que se guarda. */
export interface ViewDraft {
  query: string
  columns?: string[]
}

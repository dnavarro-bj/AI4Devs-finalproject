import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { SavedView, SavedViewInput, ViewScope } from '../types/view.types'

/**
 * Las vistas guardadas: consultas con nombre sobre el inventario y grupos de especies.
 *
 * Una colección tiene decenas de vistas, no miles, así que se pide una sola página grande: el
 * selector las muestra todas y paginarlo no ayudaría. Ningún método lanza (ADR-015).
 */
const PAGE_SIZE = 500

export const savedViewsApiService = {
  async list(scope: ViewScope): Promise<ServiceResponse<SavedView[]>> {
    try {
      const page = await getApiClient().get<PageResponse<SavedView>>('/saved-views', { scope, page: 0, size: PAGE_SIZE })
      return ok(page.content)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(input: SavedViewInput): Promise<ServiceResponse<SavedView>> {
    try {
      return ok(await getApiClient().post<SavedView>('/saved-views', input))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Reemplazo completo: el cuerpo es la vista entera, también cuando solo se renombra. */
  async replace(id: string, input: SavedViewInput): Promise<ServiceResponse<SavedView>> {
    try {
      return ok(await getApiClient().put<SavedView>(`/saved-views/${id}`, input))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async remove(id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/saved-views/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

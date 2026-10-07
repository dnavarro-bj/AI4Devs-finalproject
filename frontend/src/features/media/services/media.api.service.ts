import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { MediaOwner, MediaPhoto, PhotoPatch, PhotoQuery, UploadFields } from '../types/media.types'

const base = (owner: MediaOwner) => `/${owner.kind}/${owner.id}/photos`

/**
 * Las fotografías de una especie o de un ejemplar. Una sola implementación para los dos dueños: la
 * ruta es la única diferencia. Habla con el API y nada más, y nunca lanza (ADR-015).
 */
export const mediaApiService = {
  async list(owner: MediaOwner, query: PhotoQuery = {}): Promise<ServiceResponse<PageResponse<MediaPhoto>>> {
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.size) params.size = query.size
    if (query.sort) params.sort = query.sort
    if (query.purpose) params.purpose = query.purpose
    if (query.event) params.event = query.event
    try {
      return ok(await getApiClient().get<PageResponse<MediaPhoto>>(base(owner), params))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Los campos de texto valen para todos los archivos; los ausentes no viajan. */
  async upload(owner: MediaOwner, files: File[], fields: UploadFields = {}): Promise<ServiceResponse<MediaPhoto[]>> {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    for (const [name, value] of Object.entries(fields)) {
      if (value !== undefined && value !== '') form.append(name, value)
    }
    try {
      return ok(await getApiClient().postForm<MediaPhoto[]>(base(owner), form))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async update(owner: MediaOwner, mediaId: string, patch: PhotoPatch): Promise<ServiceResponse<MediaPhoto>> {
    try {
      return ok(await getApiClient().put<MediaPhoto>(`${base(owner)}/${mediaId}`, patch))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Recibe **todos** los identificadores en su nuevo orden: el servidor rechaza una lista incompleta. */
  async reorder(owner: MediaOwner, ids: string[]): Promise<ServiceResponse<MediaPhoto[]>> {
    try {
      return ok(await getApiClient().put<MediaPhoto[]>(`${base(owner)}/order`, { ids }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async remove(owner: MediaOwner, mediaId: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`${base(owner)}/${mediaId}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

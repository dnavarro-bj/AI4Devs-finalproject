import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useRuntimeConfig } from '#imports'
import type { GalleryImage } from '@ui/UiMediaGallery.vue'
import { fail, ok, type ServiceResponse } from '@shared/types/api.types'
import { validateImageFiles } from '@shared/utils/imageFiles'
import { mediaApiService } from '../services/media.api.service'
import { toGalleryImage } from '../mappers/media.mapper'
import type { MediaOwner, MediaPhoto, PhotoPatch, UploadFields } from '../types/media.types'

/** Un archivo que se está subiendo o que falló: cada uno con su estado, no uno global. */
export interface UploadItem {
  key: string
  name: string
  status: 'uploading' | 'error'
  message?: string
}

/** Un píxel transparente: el hueco de un archivo todavía sin imagen guardada. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** El límite por dueño es 50: una página de 50 es la galería entera, sin «cargar más». */
const GALLERY_SIZE = 50

/**
 * El caso de uso de una galería de fotografías, igual para una especie que para un ejemplar:
 * cargar, subir con estado **por archivo**, elegir la portada, corregir, reordenar y borrar. No
 * hace HTTP directo (ADR-015).
 *
 * **Cada archivo viaja en su petición**: el servidor es todo-o-nada por petición, así que subirlos
 * juntos haría que uno malo hiciera perder los demás. Un fallo queda en su archivo, con su motivo,
 * y el resto se sube.
 */
export function useMediaGallery(
  owner: MediaOwner,
  options: { sort?: MaybeRefOrGetter<'position' | undefined>, eventHref?: (eventId: string) => string } = {},
) {
  const base = useRuntimeConfig().public.apiBaseUrl as string

  const photos = ref<MediaPhoto[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** El fallo de la última operación (corregir, borrar…): no tumba la galería cargada. */
  const actionError = ref<string | null>(null)
  const uploads = ref<UploadItem[]>([])
  let sequence = 0

  function fetchPage() {
    const sort = toValue(options.sort)
    return mediaApiService.list(owner, { page: 0, size: GALLERY_SIZE, ...(sort ? { sort } : {}) })
  }

  async function load() {
    loading.value = true
    error.value = null
    const result = await fetchPage()
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    photos.value = result.data?.content ?? []
    total.value = result.data?.totalElements ?? photos.value.length
  }

  /** Sin estado de carga: la galería que hay se queda hasta que llegue la nueva. */
  async function refresh() {
    const result = await fetchPage()
    if (result.success) {
      photos.value = result.data?.content ?? []
      total.value = result.data?.totalElements ?? photos.value.length
    }
  }

  async function upload(files: File[], fields: UploadFields = {}): Promise<{ uploaded: number, failed: number }> {
    const { accepted, rejected } = validateImageFiles(files, { existing: total.value })
    let uploaded = 0
    let failed = rejected.length

    for (const entry of rejected) {
      uploads.value.push({ key: `u${++sequence}`, name: entry.file.name, status: 'error', message: entry.message })
    }

    for (const file of accepted) {
      const item: UploadItem = { key: `u${++sequence}`, name: file.name, status: 'uploading' }
      uploads.value.push(item)
      const result = await mediaApiService.upload(owner, [file], fields)
      const current = uploads.value.find((entry) => entry.key === item.key)!

      if (result.success) {
        uploaded++
        uploads.value = uploads.value.filter((entry) => entry.key !== item.key)
      } else {
        failed++
        current.status = 'error'
        current.message = result.error!.message
      }
    }

    if (uploaded > 0) await refresh()
    return { uploaded, failed }
  }

  function dismissUpload(key: string) {
    uploads.value = uploads.value.filter((entry) => entry.key !== key)
  }

  /** Corrige, y recarga: una nueva fecha de captura o una nueva portada recolocan el resto. */
  async function update(id: string, patch: PhotoPatch): Promise<ServiceResponse<MediaPhoto>> {
    actionError.value = null
    const result = await mediaApiService.update(owner, id, patch)
    if (!result.success) {
      actionError.value = result.error!.message
      return result
    }
    await refresh()
    return result
  }

  const makePrimary = (id: string) => update(id, { primary: true })

  async function reorder(ids: string[]) {
    actionError.value = null
    const previous = photos.value
    photos.value = ids.map((id) => previous.find((entry) => entry.id === id)).filter((entry): entry is MediaPhoto => !!entry)

    const result = await mediaApiService.reorder(owner, ids)
    if (!result.success) {
      photos.value = previous
      error.value = result.error!.message
    }
  }

  async function remove(id: string): Promise<ServiceResponse<null>> {
    actionError.value = null
    const result = await mediaApiService.remove(owner, id)
    if (!result.success) {
      actionError.value = result.error!.message
      return fail(result.error!)
    }
    await refresh()
    return ok(null)
  }

  const images = computed<GalleryImage[]>(() => [
    ...photos.value.map((photo) => toGalleryImage(photo, base, options)),
    ...uploads.value.map((item): GalleryImage => ({
      id: item.key,
      src: BLANK,
      alt: item.name,
      status: item.status,
      statusText: item.status === 'uploading' ? `Subiendo ${item.name}…` : `${item.name}: ${item.message ?? 'no se ha podido subir'}`,
    })),
  ])

  return {
    photos, total, loading, error, actionError, uploads, images,
    load, upload, dismissUpload, update, makePrimary, reorder, remove,
  }
}

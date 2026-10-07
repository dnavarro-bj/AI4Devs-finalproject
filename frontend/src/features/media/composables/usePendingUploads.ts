import { computed, shallowRef } from 'vue'
import { validateImageFiles } from '@shared/utils/imageFiles'
import { mediaApiService } from '../services/media.api.service'
import type { MediaOwner, UploadFields } from '../types/media.types'

interface PendingFile {
  key: string
  owner: MediaOwner
  file: File
  fields: UploadFields
  message: string
}

/** Lo no subido de un dueño, tal y como lo ve la pantalla. */
export interface PendingView {
  key: string
  name: string
  message: string
  /** El evento del que colgaría, si la foto se adjuntó a uno. */
  eventId?: string
}

/**
 * La cola de lo que **no llegó a subirse**. Estado de módulo, como los toasts: sobrevive a la
 * navegación del alta a la ficha, que es exactamente donde hay que poder reintentar.
 *
 * Existe por una decisión de diseño: se sube **después de guardar** (el alta y los diálogos no
 * cambian de contrato), así que la entidad ya existe cuando falla una imagen. Un fallo **nunca**
 * bloquea ni deshace lo guardado: queda aquí con su motivo, la pantalla avisa y la ficha ofrece
 * reintentar. Los `File` se guardan en memoria: cerrar la pestaña los pierde, y se acepta.
 */
/** `shallowRef` con cambios inmutables: un `File` no debe volverse un proxy reactivo. */
const queue = shallowRef<PendingFile[]>([])
let sequence = 0

export function usePendingUploads() {
  async function send(entries: PendingFile[]): Promise<{ uploaded: number, failed: number }> {
    let uploaded = 0
    let failed = 0
    for (const entry of entries) {
      const result = await mediaApiService.upload(entry.owner, [entry.file], entry.fields)
      if (result.success) {
        uploaded++
        queue.value = queue.value.filter((pending) => pending.key !== entry.key)
      } else {
        failed++
        const failedEntry = { ...entry, message: result.error!.message }
        queue.value = queue.value.some((pending) => pending.key === entry.key)
          ? queue.value.map((pending) => (pending.key === entry.key ? failedEntry : pending))
          : [...queue.value, failedEntry]
      }
    }
    return { uploaded, failed }
  }

  /** Sube lo recién elegido. Nunca lanza: lo que falla se queda en la cola con su motivo. */
  async function uploadAfterSave(owner: MediaOwner, files: File[], fields: UploadFields = {}) {
    const { accepted, rejected } = validateImageFiles(files)
    queue.value = [
      ...queue.value,
      ...rejected.map((entry) => ({ key: `p${++sequence}`, owner, file: entry.file, fields, message: entry.message })),
    ]
    const sent = await send(accepted.map((file) => ({ key: `p${++sequence}`, owner, file, fields, message: '' })))
    return { uploaded: sent.uploaded, failed: sent.failed + rejected.length }
  }

  const sameOwner = (a: MediaOwner, b: MediaOwner) => a.kind === b.kind && a.id === b.id

  function pendingFor(owner: MediaOwner) {
    return computed<PendingView[]>(() => queue.value
      .filter((entry) => sameOwner(entry.owner, owner))
      .map((entry) => ({
        key: entry.key,
        name: entry.file.name,
        message: entry.message,
        ...(entry.fields.eventId ? { eventId: entry.fields.eventId } : {}),
      })))
  }

  /** Reintenta lo pendiente del dueño. Lo que no se admitía no se reenvía: no cambiaría nada. */
  async function retry(owner: MediaOwner) {
    const mine = queue.value.filter((entry) => sameOwner(entry.owner, owner))
    const { accepted } = validateImageFiles(mine.map((entry) => entry.file))
    const retryable = mine.filter((entry) => accepted.includes(entry.file))
    return send(retryable)
  }

  function discard(owner: MediaOwner) {
    queue.value = queue.value.filter((entry) => !sameOwner(entry.owner, owner))
  }

  function discardAll() {
    queue.value = []
  }

  return { uploadAfterSave, pendingFor, retry, discard, discardAll }
}

import { ref } from 'vue'
import { useToast } from '@shared/composables/useToast'
import { downloadBlob } from '@shared/utils/downloadBlob'
import { exportsApiService } from '../services/exports.api.service'
import type { ExportKind } from '../types/export.types'

/** El nombre de reserva si el servidor no fija uno: no debería ocurrir, pero una descarga sin nombre es peor. */
const FALLBACK_NAMES: Record<ExportKind, string> = {
  plants: 'cactify-plantas.csv',
  species: 'cactify-especies.csv',
}

/**
 * El caso de uso de exportar desde una pantalla de listado.
 *
 * Recibe la consulta ya traducida a lenguaje del API —quien la traduce es la pantalla, que es la
 * única que sabe qué parte de su estado es del API y cuál no—, la pide al service y entrega el
 * archivo al navegador. Dos garantías: **una sola exportación en vuelo** (un segundo clic no pide
 * otra) y **el error del servidor tal cual**, sin que el frontend conozca el máximo de filas: el
 * mensaje del `422` ya dice cuántas son y cuál es.
 */
export function useExport(kind: ExportKind) {
  const exporting = ref(false)
  const error = ref<string | null>(null)
  const toast = useToast()

  async function run(query: string) {
    if (exporting.value) return
    exporting.value = true
    error.value = null

    const result = await exportsApiService.export(kind, query)
    exporting.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }

    const name = result.data!.filename ?? FALLBACK_NAMES[kind]
    downloadBlob(result.data!.blob, name)
    toast.show(`Exportación lista: ${name}`)
  }

  const clearError = () => { error.value = null }

  return { exporting, error, run, clearError }
}

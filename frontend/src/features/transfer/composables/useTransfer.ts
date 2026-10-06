import { computed, ref } from 'vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { transferApiService } from '../services/transfer.api.service'
import type {
  Backup,
  ExportContent,
  ImportReview,
  ImportStep,
  TransferActivity,
} from '../types/transfer.types'

/**
 * El caso de uso de importar y exportar. Todo es **simulación**: ninguna operación toca el API ni
 * el inventario.
 *
 * La importación es una **máquina de estados** —`file → review → complete`— y no tres pantallas.
 * **Aplicar solo es alcanzable sin errores, y esa regla vive aquí**, en la transición: un botón
 * deshabilitado en el componente se salta; una transición que no existe, no. Es lo que garantiza
 * que ningún dato se descarte en silencio.
 */
export function useTransfer() {
  const today = useReferenceDate()
  const step = ref<ImportStep>('file')
  const review = ref<ImportReview | null>(null)
  const fixed = ref(false)

  const backup = ref<Backup | null>(null)
  const activity = ref<TransferActivity[]>([])

  const content = ref<ExportContent>('full')
  const format = ref('csv')
  const encoding = ref('utf-8')
  const includeHistory = ref(true)
  const includePhotos = ref(false)
  const estimate = ref('')
  const generated = ref(false)

  async function load() {
    const [last, recent, size] = await Promise.all([
      transferApiService.lastBackup(),
      transferApiService.activity(),
      transferApiService.estimate(content.value),
    ])
    if (last.success) backup.value = last.data!
    if (recent.success) activity.value = recent.data!
    if (size.success) estimate.value = size.data!
  }

  async function useSample() {
    const result = await transferApiService.reviewSample()
    if (!result.success) return
    review.value = result.data!
    fixed.value = false
    step.value = 'review'
  }

  /** Cuántas filas siguen con error: las del archivo menos las ya corregidas. */
  const errorCount = computed(() => (review.value && !fixed.value ? review.value.errors : 0))
  const readyCount = computed(() =>
    review.value ? review.value.ready + (fixed.value ? review.value.errors : 0) : 0)

  /** Las filas de la tabla, con las corregidas ya como válidas. */
  const rows = computed(() => (review.value?.preview ?? []).map((row) =>
    fixed.value && row.result === 'error' ? { ...row, result: 'valid' as const, reason: 'Corregida' } : row))

  function fixErrors() {
    if (review.value) fixed.value = true
  }

  /** `false` si no se puede: sin archivo o con errores pendientes. Nada se descarta. */
  function apply(): boolean {
    if (step.value !== 'review' || !review.value || errorCount.value > 0) return false
    step.value = 'complete'
    return true
  }

  /** Cambiar de archivo: vuelve al principio **sin conservar** la validación anterior. */
  function reset() {
    step.value = 'file'
    review.value = null
    fixed.value = false
  }

  async function selectContent(next: ExportContent) {
    content.value = next
    generated.value = false
    const size = await transferApiService.estimate(next)
    if (size.success) estimate.value = size.data!
  }

  const fileName = computed(() => {
    const extension = { csv: 'csv', xlsx: 'xlsx', pdf: 'pdf' }[format.value] ?? 'csv'
    const base = { full: 'inventario', filtered: 'filtrado', labels: 'etiquetas' }[content.value]
    return `cactify-${base}-${today.value}.${extension}`
  })

  function generate() {
    generated.value = true
  }

  return {
    step, review, load, useSample, errorCount, readyCount, rows, fixErrors, apply, reset,
    backup, activity,
    content, format, encoding, includeHistory, includePhotos, estimate, generated,
    selectContent, fileName, generate,
  }
}

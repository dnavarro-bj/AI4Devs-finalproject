import { ref } from 'vue'
import { alertsApiService } from '../services/alerts.api.service'
import type { Alert, AlertListQuery } from '../types/alert.types'

/** Lo que una ficha enseña de sus alertas: las más graves, y cuántas hay en total. */
const PREVIEW = 5

/**
 * Las alertas **abiertas** de una localización —y de lo que contiene— o de un ejemplar, de la más
 * grave a la más leve: el orden por defecto de la bandeja. El API resuelve qué le afecta; aquí solo se
 * pide con el criterio de la ficha. `criteria` es una función porque el identificador puede no estar
 * listo al montar.
 */
export function useRelatedAlerts(criteria: () => Pick<AlertListQuery, 'plant' | 'location' | 'includeDescendants'>, size = PREVIEW) {
  const alerts = ref<Alert[]>([])
  const total = ref(0)
  /** `false` hasta la primera respuesta: «sin consultar» no es «sin alertas». */
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    const result = await alertsApiService.list({ ...criteria(), status: ['nueva', 'revisada'], size })
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    alerts.value = result.data!.content
    total.value = result.data!.totalElements
    loaded.value = true
  }

  return { alerts, total, loaded, loading, error, load }
}

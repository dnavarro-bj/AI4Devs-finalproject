import { ref } from 'vue'
import { useToast } from '@shared/composables/useToast'
import { alertsApiService } from '../services/alerts.api.service'
import type { Alert, AlertInput, AlertTransitionAction } from '../types/alert.types'

const DONE: Record<AlertTransitionAction, string> = {
  review: 'Alerta marcada como revisada',
  resolve: 'Alerta resuelta',
  dismiss: 'Alerta descartada',
}

/**
 * Revisar, resolver, descartar y anotar una alerta. Una alerta **se cierra siempre por una
 * persona**: aquí no hay nada automático, cada llamada es una acción explícita.
 *
 * El error del API **no se pierde en un toast**: queda en `error` para que el diálogo lo muestre sin
 * cerrarse y sin perder el comentario escrito.
 */
export function useAlertActions() {
  const toast = useToast()
  const submitting = ref(false)
  const error = ref<string | null>(null)

  /** Devuelve la alerta ya movida, o `null` si falló (y entonces `error` dice por qué). */
  async function transition(id: string, action: AlertTransitionAction, comment?: string): Promise<Alert | null> {
    submitting.value = true
    error.value = null

    const result = await alertsApiService.transition(id, action, comment)
    submitting.value = false

    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    toast.show(DONE[action])
    return result.data!
  }

  async function create(input: AlertInput): Promise<Alert | null> {
    submitting.value = true
    error.value = null

    const result = await alertsApiService.create(input)
    submitting.value = false

    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    toast.show('Alerta anotada')
    return result.data!
  }

  function reset() {
    error.value = null
    submitting.value = false
  }

  return { submitting, error, transition, create, reset }
}

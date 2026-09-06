/**
 * Confirmaciones efímeras. Estado a nivel de módulo y no un store de Pinia: no hay nada que
 * persistir, ni que hidratar, ni que compartir con el servidor.
 *
 * Un toast confirma algo **ya ocurrido**. No sustituye a un error de formulario ni guarda
 * información que el usuario vaya a necesitar recuperar.
 */
export interface Toast {
  id: number
  message: string
}

const toasts = ref<Toast[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 0

const DEFAULT_DURATION = 4000

export function useToast() {
  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(message: string, duration = DEFAULT_DURATION) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, message }]
    // Cancelable, para que el test lo dispare sin esperar de verdad.
    timers.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }

  function clear() {
    for (const id of [...timers.keys()]) dismiss(id)
    toasts.value = []
  }

  return { toasts: readonly(toasts), show, dismiss, clear }
}

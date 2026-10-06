import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * El valor de otro `ref` tras una **pausa**: mientras el origen sigue cambiando no se entrega nada, y
 * cuando se queda quieto `delay` milisegundos llega solo el último.
 *
 * Existe para que escribir en un buscador no lance una petición por tecla. Lo usan el inventario y
 * la búsqueda global; sube a `shared` por lo mismo que cualquier cosa que usan dos features
 * (ADR-015), y para que haya un único retardo y no dos distintos.
 *
 * Empieza con el valor de origen, sin esperar: la pausa es para los cambios, no para el primero.
 */
export function useDebouncedRef<T>(source: Ref<T>, delay = 250): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = value }, delay)
  })

  onScopeDispose(() => clearTimeout(timer))

  return debounced
}

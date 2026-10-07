import { ref, watch } from 'vue'
import { useDebouncedRef } from './useDebouncedRef'

/**
 * La caja de búsqueda de un listado cuyo estado vive en la URL (`useUrlState`).
 *
 * Lo escrito se aplica a `state.q` tras una **pausa** —no por tecla—, y un cambio de `state.q` desde
 * fuera (un enlace que llega con otra búsqueda, la búsqueda global) se vuelca a la caja. Quitar la
 * búsqueda es **inmediato**: no hay nada que esperar para deshacerla.
 *
 * Lo comparten el inventario y el catálogo de especies: es lógica de pantalla repetida, no de
 * presentación, así que es un composable y no un componente del kit.
 */
export function useSearchText(state: { q: string }, delay = 250) {
  const text = ref(state.q)
  const applied = useDebouncedRef(text, delay)

  watch(applied, (value) => { state.q = value.trim() })
  watch(() => state.q, (value) => {
    if (value === applied.value.trim()) return
    text.value = value
    applied.value = value
  })

  function clear() {
    text.value = ''
    applied.value = ''
    state.q = ''
  }

  return { text, clear }
}

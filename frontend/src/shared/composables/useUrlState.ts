import { reactive, watch } from 'vue'
import { readUrlState, stateKey, toUrlQuery, type UrlSchema, type UrlState } from '../utils/urlState'

/**
 * El estado de una pantalla de listado, sincronizado con la URL.
 *
 * El estado **vive aquí** (un objeto reactivo que la pantalla lee y escribe) y la URL es su
 * espejo en los dos sentidos: lo que cambia en la pantalla se escribe con `replace` —no `push`, que
 * dejaría una entrada de historial por cada cambio— y lo que cambia en la URL desde fuera (un
 * enlace que lleva a la misma pantalla con otros criterios) se lee de vuelta.
 *
 * Los dos sentidos se comparan por su forma canónica antes de actuar, así que no se pisan entre
 * sí ni entran en bucle. Lo desconocido o inválido de la URL se descarta (véase `readUrlState`).
 */
export function useUrlState<S extends UrlSchema>(schema: S) {
  const route = useRoute()
  const router = useRouter()

  const state = reactive(readUrlState(schema, route.query)) as UrlState<S>

  /**
   * Lo que esta pantalla ha escrito y la URL aún no ha devuelto. El router es asíncrono: sin esto, el
   * eco de una escritura anterior llegaría **después** de un cambio más reciente y lo desharía.
   */
  const written = new Set<string>()

  watch(
    () => stateKey(schema, state),
    (key) => {
      if (stateKey(schema, readUrlState(schema, route.query)) === key) return
      written.add(key)
      router.replace({ query: toUrlQuery(schema, state) })
    },
  )

  watch(
    () => route.query,
    (query) => {
      const next = readUrlState(schema, query)
      const key = stateKey(schema, next)
      // El eco de lo que se escribió no es un cambio externo; con el último, se ha puesto al día.
      if (written.has(key)) {
        if (key === stateKey(schema, state)) written.clear()
        return
      }
      if (key !== stateKey(schema, state)) Object.assign(state, next)
    },
  )

  return { state }
}

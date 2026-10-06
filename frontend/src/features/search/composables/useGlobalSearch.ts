import { computed, ref, watch } from 'vue'
import { useDebouncedRef } from '@shared/composables/useDebouncedRef'
import { searchApiService } from '../services/search.api.service'
import type { SearchGroup } from '../types/search.types'

/**
 * El buscador de la barra superior: el texto y sus resultados ya agrupados.
 *
 * El componente del kit no busca —recibe los grupos y emite la selección—, así que quien orquesta
 * es este composable. Hace dos cosas que un buscador contra el API necesita:
 *
 * * **Esperar una pausa** antes de buscar: escribir no lanza una petición por tecla.
 * * **Descartar lo obsoleto**: cada búsqueda lleva un número de secuencia, y una respuesta solo se
 *   aplica si sigue siendo la última. Con red irregular dos peticiones se cruzan, y sin esto el
 *   diálogo acabaría mostrando resultados de un texto que ya no está en la caja. Es más simple que
 *   cancelar peticiones y no exige que el cliente HTTP lo admita.
 */
export function useGlobalSearch() {
  const query = ref('')
  const settled = useDebouncedRef(query, 200)
  const groups = ref<SearchGroup[]>([])
  let latest = 0

  // Vaciar la caja limpia **al instante**: no hay nada que esperar para no mostrar nada, y una
  // respuesta en vuelo de la búsqueda anterior ya no debe poder rellenarla.
  watch(query, (value) => {
    if (value.trim()) return
    latest += 1
    groups.value = []
  })

  watch(settled, async (value) => {
    if (!value.trim()) return
    const current = ++latest
    const result = await searchApiService.search(value)
    if (current !== latest) return
    groups.value = result.success ? result.data! : []
  })

  function clear() {
    query.value = ''
  }

  return { query, groups: computed(() => groups.value), clear }
}

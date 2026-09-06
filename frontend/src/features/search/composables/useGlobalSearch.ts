import { computed, ref, watch } from 'vue'
import { searchApiService } from '../services/search.api.service'
import type { SearchGroup } from '../types/search.types'

/**
 * El buscador de la barra superior: el texto y sus resultados ya agrupados.
 *
 * El componente del kit no busca —recibe los grupos y emite la selección—, así que quien orquesta
 * es este composable.
 */
export function useGlobalSearch() {
  const query = ref('')
  const groups = ref<SearchGroup[]>([])

  watch(query, async (value) => {
    if (!value.trim()) {
      groups.value = []
      return
    }
    const result = await searchApiService.search(value)
    groups.value = result.success ? result.data! : []
  })

  function clear() {
    query.value = ''
  }

  return { query, groups: computed(() => groups.value), clear }
}

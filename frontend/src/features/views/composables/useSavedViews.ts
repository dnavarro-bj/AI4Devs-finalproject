import { computed, ref } from 'vue'
import type { ServiceResponse } from '@shared/types/api.types'
import { sameDraft } from '../mappers/viewState'
import { savedViewsApiService } from '../services/saved-views.api.service'
import type { SavedView, SavedViewInput, ViewDraft, ViewScope } from '../types/view.types'

/**
 * Lo que la pantalla le presta al composable: su estado y cómo aplicarle una vista.
 *
 * El composable no conoce la URL ni los parámetros de ninguna pantalla: **la pantalla traduce**.
 * `current` lee el estado reactivo de la pantalla, ya convertido a lo que se guarda; `apply`
 * escribe una vista en ese estado, que la URL refleja.
 */
export interface ViewsAdapter {
  current: () => ViewDraft
  apply: (view: SavedView) => void
}

/**
 * Los casos de uso de las vistas guardadas de una pantalla (inventario o catálogo de especies).
 *
 * **«Aplicada» se deriva, no se recuerda**: es la vista cuyo borrador coincide con el estado actual
 * de la pantalla. Si se cambia un criterio la marca desaparece sola, y la pantalla y la vista no
 * pueden desincronizarse. Lo único que se recuerda es cuál fue la **última aplicada**, para poder
 * ofrecer «reemplazarla con este estado» cuando se ha tocado.
 *
 * Sin store: las vistas son estado de una pantalla, no de varias features (ADR-015).
 */
export function useSavedViews(scope: ViewScope, adapter: ViewsAdapter) {
  const views = ref<SavedView[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const lastAppliedId = ref<string | null>(null)

  const byName = (a: SavedView, b: SavedView) => a.name.localeCompare(b.name, 'es')

  function upsert(saved: SavedView) {
    views.value = [...views.value.filter((item) => item.id !== saved.id), saved].sort(byName)
  }

  const applied = computed<SavedView | null>(() => {
    const draft = adapter.current()
    return views.value.find((item) => sameDraft(draft, item)) ?? null
  })

  /** La última vista aplicada cuando el estado ya no coincide con ella: la que se ofrece reemplazar. */
  const modified = computed<SavedView | null>(() => {
    if (applied.value) return null
    return views.value.find((item) => item.id === lastAppliedId.value) ?? null
  })

  async function load() {
    loading.value = true
    loadError.value = null
    const result = await savedViewsApiService.list(scope)
    loading.value = false

    if (!result.success) {
      loadError.value = result.error!.message
      return
    }
    views.value = [...result.data!].sort(byName)
  }

  function apply(view: SavedView) {
    lastAppliedId.value = view.id
    adapter.apply(view)
  }

  const input = (name: string, draft: ViewDraft): SavedViewInput => ({
    scope,
    name,
    query: draft.query,
    ...(draft.columns ? { columns: draft.columns } : {}),
  })

  async function saveCurrent(name: string): Promise<ServiceResponse<SavedView>> {
    const result = await savedViewsApiService.create(input(name.trim(), adapter.current()))
    if (result.success) {
      upsert(result.data!)
      lastAppliedId.value = result.data!.id
    }
    return result
  }

  /** `PUT` es reemplazo completo: el estado actual **sustituye** la consulta y las columnas guardadas. */
  async function replaceWithCurrent(view: SavedView): Promise<ServiceResponse<SavedView>> {
    const result = await savedViewsApiService.replace(view.id, input(view.name, adapter.current()))
    if (result.success) {
      upsert(result.data!)
      lastAppliedId.value = result.data!.id
    }
    return result
  }

  /** Renombrar no toca lo guardado, pero el API pide la vista entera. */
  async function rename(view: SavedView, name: string): Promise<ServiceResponse<SavedView>> {
    const result = await savedViewsApiService.replace(view.id, input(name.trim(), view))
    if (result.success) upsert(result.data!)
    return result
  }

  async function remove(view: SavedView): Promise<ServiceResponse<null>> {
    const result = await savedViewsApiService.remove(view.id)
    if (result.success) {
      views.value = views.value.filter((item) => item.id !== view.id)
      if (lastAppliedId.value === view.id) lastAppliedId.value = null
    }
    return result
  }

  return { views, loading, loadError, applied, modified, load, apply, saveCurrent, replaceWithCurrent, rename, remove }
}

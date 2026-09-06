/**
 * Los breadcrumbs de la pantalla actual.
 *
 * No se derivan de la ruta: `/plants/882687672222443468` daría un TSID como último nivel, que no
 * identifica nada para quien mira. Los fija la página —el inventario en `setup`, la ficha cuando
 * el API responde (ADR-013)— y el armazón los lee.
 */
export interface Breadcrumb {
  label: string
  to?: string
}

const breadcrumbs = ref<Breadcrumb[]>([])

export function useBreadcrumbs() {
  function set(items: Breadcrumb[]) {
    breadcrumbs.value = items
  }

  /** Se llama al cambiar de pantalla: ninguna hereda los de la anterior. */
  function clear() {
    breadcrumbs.value = []
  }

  return { breadcrumbs: readonly(breadcrumbs), set, clear }
}

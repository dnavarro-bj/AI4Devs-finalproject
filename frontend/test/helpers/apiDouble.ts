import { vi } from 'vitest'

/**
 * Doble del cliente del API: los tests no tocan la red ni levantan el backend.
 *
 * Se declara en el nivel superior de cada fichero de test y se enchufa con `mockNuxtImport`, que
 * se iza y no admite llamarse desde dentro de una función.
 */
export function createApiDouble(options: { savedViews?: boolean } = {}) {
  const emptyPage = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 500 }
  const savedViews = vi.fn(async () => emptyPage)
  const inner = vi.fn()

  /**
   * Las pantallas de listado piden además sus vistas guardadas. Con `savedViews`, esa petición no
   * llega a `get`: ni se mezcla con los datos que el test sirve ni consume sus respuestas únicas, y
   * se controla aparte con `api.savedViews`. Sin él (los tests de las propias vistas), todo pasa
   * por `get` como cualquier otra ruta.
   */
  const get = options.savedViews
    ? new Proxy(inner, {
        apply(target, thisArg, args: unknown[]) {
          if (typeof args[0] === 'string' && args[0].startsWith('/saved-views')) return savedViews(...(args as []))
          return Reflect.apply(target, thisArg, args)
        },
      })
    : inner

  return {
    get,
    /** La descarga de archivos: `{ blob, filename }`. */
    getBlob: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    savedViews,
  }
}

/**
 * Deja correr los `onMounted` asíncronos. Las páginas piden sus datos **ya montadas** y no en
 * `setup` (ADR-013): en el contenedor la URL del API solo es válida en el navegador, así que una
 * petición en renderizado de servidor no llega.
 */
export function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

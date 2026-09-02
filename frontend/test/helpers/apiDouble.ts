import { vi } from 'vitest'

/**
 * Doble del cliente del API: los tests no tocan la red ni levantan el backend.
 *
 * Se declara en el nivel superior de cada fichero de test y se enchufa con `mockNuxtImport`, que
 * se iza y no admite llamarse desde dentro de una función.
 */
export function createApiDouble() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

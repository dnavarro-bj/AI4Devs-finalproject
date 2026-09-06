import type { ApiErrorBody } from '@shared/types/api.types'

/**
 * Lo que lanza el cliente HTTP, y **solo** él: nada fuera de `shared/services/` vuelve a verlo.
 * El service lo captura y lo convierte en `DomainError` (ADR-015).
 */
export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

type Fetcher = (url: string, options?: Record<string, unknown>) => Promise<unknown>

const GENERIC_MESSAGE = 'No se ha podido completar la operación. Inténtalo de nuevo.'

/**
 * Envuelve el cliente HTTP y traduce **todo** fallo a un `ApiError` con un mensaje pintable: el
 * del cuerpo uniforme del API cuando viene, y uno genérico cuando no —el caso de lo que escapa a
 * `ApiExceptionHandler` y sale con el cuerpo por defecto de Spring, sin `message`, y el de un
 * fallo de red, que no trae respuesta ninguna—.
 *
 * Recibe el `fetcher` por parámetro para que los tests lo doblen sin tocar la red.
 */
export function createApiClient(baseUrl: string, fetcher: Fetcher) {
  const request = async <T>(path: string, options: Record<string, unknown> = {}): Promise<T> => {
    try {
      return (await fetcher(`${baseUrl}${path}`, options)) as T
    } catch (cause) {
      throw toApiError(cause)
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, unknown>) =>
      request<T>(path, query ? { method: 'GET', query } : { method: 'GET' }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    /** Sin cuerpo: el API responde `204` y no devuelve nada que interpretar. */
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

function toApiError(cause: unknown): ApiError {
  const failure = cause as { response?: { status?: number }, data?: Partial<ApiErrorBody> }
  const status = failure?.response?.status ?? failure?.data?.status ?? 0
  const message = failure?.data?.message

  return new ApiError(
    status,
    typeof message === 'string' && message.trim() !== '' ? message : GENERIC_MESSAGE,
  )
}

/**
 * El cliente del API de la aplicación: `createApiClient` sobre `$fetch`, con la URL base de
 * `runtimeConfig.public` (ADR-013: una sola URL, la válida en el navegador).
 *
 * Lo llaman los **services**, que es la única capa que habla con el API (ADR-015). Se
 * auto-importa —`imports.dirs` en `nuxt.config.ts`— para que los tests lo puedan doblar con
 * `mockNuxtImport` sin conocer la implementación.
 */
export function getApiClient() {
  const { public: { apiBaseUrl } } = useRuntimeConfig()
  return createApiClient(apiBaseUrl, $fetch as never)
}

import { ApiError, type ApiErrorBody } from '../types/api'

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

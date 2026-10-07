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

/** La variante que devuelve la respuesta entera —cuerpo y cabeceras—, que es lo que una descarga necesita. */
type RawFetcher = (url: string, options?: Record<string, unknown>) => Promise<{ _data?: unknown, headers: Headers }>

/** Un archivo descargado: sus bytes y el nombre que fija el servidor, si lo fija. */
export interface DownloadedFile {
  blob: Blob
  filename: string | null
}

const GENERIC_MESSAGE = 'No se ha podido completar la operación. Inténtalo de nuevo.'

/**
 * Envuelve el cliente HTTP y traduce **todo** fallo a un `ApiError` con un mensaje pintable: el
 * del cuerpo uniforme del API cuando viene, y uno genérico cuando no —el caso de lo que escapa a
 * `ApiExceptionHandler` y sale con el cuerpo por defecto de Spring, sin `message`, y el de un
 * fallo de red, que no trae respuesta ninguna—.
 *
 * Recibe el `fetcher` por parámetro para que los tests lo doblen sin tocar la red. `raw` es la
 * variante con cabeceras, que solo necesitan las descargas.
 */
export function createApiClient(baseUrl: string, fetcher: Fetcher, raw?: RawFetcher) {
  const request = async <T>(path: string, options: Record<string, unknown> = {}): Promise<T> => {
    try {
      return (await fetcher(`${baseUrl}${path}`, options)) as T
    } catch (cause) {
      throw toApiError(cause)
    }
  }

  /**
   * Un archivo, no JSON. Con `responseType: 'blob'` también el cuerpo de un error llega como blob,
   * así que se vuelve a leer como JSON antes de traducirlo: sin esto el mensaje del servidor —«1200
   * filas superan el máximo»— se perdería detrás de un fallo genérico.
   */
  const download = async (path: string, query?: Record<string, unknown>): Promise<DownloadedFile> => {
    try {
      if (!raw) throw new Error('El cliente no admite descargas')
      const response = await raw(`${baseUrl}${path}`, {
        method: 'GET',
        ...(query ? { query } : {}),
        responseType: 'blob',
      })
      return {
        blob: response._data as Blob,
        filename: filenameFrom(response.headers.get('content-disposition')),
      }
    } catch (cause) {
      throw toApiError(await readBlobBody(cause))
    }
  }

  return {
    getBlob: download,
    get: <T>(path: string, query?: Record<string, unknown>) =>
      request<T>(path, query ? { method: 'GET', query } : { method: 'GET' }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    /** Sin cuerpo: el API responde `204` y no devuelve nada que interpretar. */
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

/** El nombre del archivo según `Content-Disposition`: `filename*` (UTF-8) manda sobre `filename`. */
function filenameFrom(header: string | null): string | null {
  if (!header) return null
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]!.trim())
    } catch {
      // Un nombre mal codificado no debe tumbar la descarga: se prueba con el sencillo.
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/.exec(header)
  const name = (plain?.[1] ?? plain?.[2])?.trim()
  return name ? name : null
}

/** Si el cuerpo del error es un blob, lo lee como JSON; si no es JSON, lo deja sin cuerpo. */
async function readBlobBody(cause: unknown): Promise<unknown> {
  const failure = cause as { data?: unknown } | null
  if (!(failure?.data instanceof Blob)) return cause
  try {
    const parsed = JSON.parse(await failure.data.text())
    return { ...failure, data: parsed }
  } catch {
    return { ...failure, data: undefined }
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
  return createApiClient(apiBaseUrl, $fetch as never, $fetch.raw as never)
}

import { createApiClient } from '../utils/apiClient'

/**
 * El cliente del API de la aplicación: `createApiClient` sobre `$fetch`, con la URL base de
 * `runtimeConfig.public` (ADR-013: una sola URL, la válida en el navegador).
 */
export function useApi() {
  const { public: { apiBaseUrl } } = useRuntimeConfig()
  return createApiClient(apiBaseUrl, $fetch as never)
}

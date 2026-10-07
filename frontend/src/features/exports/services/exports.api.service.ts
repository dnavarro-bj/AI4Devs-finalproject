import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type ServiceResponse } from '@shared/types/api.types'
import type { ExportedFile, ExportKind } from '../types/export.types'

/**
 * La exportación del resultado filtrado a CSV.
 *
 * Exportar es **el listado con otro formato**: se pide a `<listado>/export` con la misma consulta
 * que el listado (ADR-016). La consulta llega ya en lenguaje del API y en forma canónica y se
 * adjunta sin tocar. El servidor decide el nombre del archivo y el máximo de filas: un exceso
 * llega como un error con su mensaje, que la pantalla muestra tal cual.
 *
 * Habla con el backend y nada más: sin `loading`, sin DOM y sin lanzar nunca (ADR-015).
 */
export const exportsApiService = {
  async export(kind: ExportKind, query: string): Promise<ServiceResponse<ExportedFile>> {
    const path = `/${kind}/export${query ? `?${query}` : ''}`
    try {
      return ok(await getApiClient().getBlob(path))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

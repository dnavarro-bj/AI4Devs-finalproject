import { ok, type ServiceResponse } from '@shared/types/api.types'
import {
  ACTIVITY_MOCK,
  BACKUP_MOCK,
  EXPORT_ESTIMATE_MOCK,
  IMPORT_SAMPLE_MOCK,
  USE_MOCK_TRANSFER,
} from '../mocks/transfer.mock'
import type { Backup, ExportContent, ImportReview, TransferActivity } from '../types/transfer.types'

/**
 * Importar y exportar.
 *
 * No existe nada de esto en el API ni hay ticket que lo recoja, así que el service resuelve contra
 * datos de ejemplo tras su bandera (ADR-015). **No sube ni descarga nada**: es una simulación
 * declarada en la pantalla, y ningún método toca el cliente HTTP.
 */
export const transferApiService = {
  /** La validación del archivo de ejemplo. Cada llamada devuelve copias: corregir no altera el mock. */
  async reviewSample(): Promise<ServiceResponse<ImportReview>> {
    return ok(USE_MOCK_TRANSFER
      ? { ...IMPORT_SAMPLE_MOCK, preview: IMPORT_SAMPLE_MOCK.preview.map((row) => ({ ...row })) }
      : { ...IMPORT_SAMPLE_MOCK, rows: 0, ready: 0, warnings: 0, errors: 0, preview: [] })
  },

  async lastBackup(): Promise<ServiceResponse<Backup>> {
    return ok({ ...BACKUP_MOCK })
  },

  async activity(): Promise<ServiceResponse<TransferActivity[]>> {
    return ok(ACTIVITY_MOCK.map((entry) => ({ ...entry })))
  },

  async estimate(content: ExportContent): Promise<ServiceResponse<string>> {
    return ok(EXPORT_ESTIMATE_MOCK[content])
  },
}

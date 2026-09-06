import { careRecordsApiService } from '../services/careRecords.api.service'
import type { CareRecordInput } from '../types/careRecord.types'

/** Registro y consulta de lecturas de cultivo. */
export function useCareRecords() {
  const create = (plantId: string, input: CareRecordInput) =>
    careRecordsApiService.create(plantId, input)

  const list = (plantId: string, page = 0) => careRecordsApiService.list(plantId, page)

  return { create, list }
}

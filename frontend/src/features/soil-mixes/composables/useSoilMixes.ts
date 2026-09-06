import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import { soilMixesApiService } from '../services/soilMixes.api.service'
import type { SoilMix, SoilMixDetail, SoilMixInput } from '../types/soilMix.types'

/**
 * Los casos de uso del catálogo de mezclas.
 *
 * Orquesta el service y **no hace HTTP directo** (ADR-015). No hay store: el catálogo no es estado
 * global entre features —lo consultan sus dos pantallas y el editor de especie, cada uno cuando lo
 * necesita—, así que un store aquí sería caché sin nadie a quien servírsela.
 *
 * Devuelve el `ServiceResponse` tal cual: quien conoce el hueco de la interfaz es la pantalla.
 */
export function useSoilMixes() {
  const list = (page = 0, sort?: string): Promise<ServiceResponse<PageResponse<SoilMix>>> =>
    soilMixesApiService.list(page, sort)

  const detail = (id: string): Promise<ServiceResponse<SoilMixDetail>> => soilMixesApiService.detail(id)

  const create = (input: SoilMixInput): Promise<ServiceResponse<SoilMix>> => soilMixesApiService.create(input)

  const update = (id: string, input: SoilMixInput): Promise<ServiceResponse<SoilMix>> =>
    soilMixesApiService.update(id, input)

  const remove = (id: string): Promise<ServiceResponse<null>> => soilMixesApiService.remove(id)

  return { list, detail, create, update, remove }
}

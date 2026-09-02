package com.cactify.domain.repos

import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.PlantId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

/**
 * Puerto de acceso a lecturas de cultivo. El listado solo existe filtrado por planta y paginado:
 * no hay `findAll()` sin límite (ADR-009).
 */
interface CareRecordRepository {
  fun save(careRecord: CareRecord): CareRecord
  fun findOneById(id: CareRecordId): CareRecord?
  fun findAllByPlantId(plantId: PlantId, pageable: Pageable): Page<CareRecord>
}

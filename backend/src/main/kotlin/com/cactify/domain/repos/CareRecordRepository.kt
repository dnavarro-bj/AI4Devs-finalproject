package com.cactify.domain.repos

import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.PlantId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.time.Instant

/**
 * Puerto de acceso a lecturas de cultivo. El listado solo existe filtrado por planta y paginado:
 * no hay `findAll()` sin límite (ADR-009).
 */
interface CareRecordRepository {
  fun save(careRecord: CareRecord): CareRecord
  fun findOneById(id: CareRecordId): CareRecord?
  fun findAllByPlantId(plantId: PlantId, pageable: Pageable): Page<CareRecord>

  /**
   * El último riego de una planta hasta un momento dado: la lectura más reciente con una cantidad
   * de riego **mayor que cero** —`NULL` es "no se midió" y `0` es "no se regó", distinción que
   * fijó T-03— y cuya fecha no sea posterior a la de la lectura que se está analizando. Ese
   * segundo límite importa desde que el cliente puede aportar fechas: sin él, un envío en lote con
   * lecturas antiguas haría que el "último riego" fuese posterior a la lectura interpretada.
   */
  fun findLastWatering(plantId: PlantId, notAfter: Instant): CareRecord?
}

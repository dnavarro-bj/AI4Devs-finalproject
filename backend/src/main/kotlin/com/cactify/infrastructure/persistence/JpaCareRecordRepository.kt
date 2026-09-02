package com.cactify.infrastructure.persistence

import com.cactify.domain.CareRecord
import com.cactify.domain.CareRecordId
import com.cactify.domain.PlantId
import com.cactify.domain.repos.CareRecordRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface JpaCareRecordRepository :
  CareRecordRepository,
  JpaRepository<CareRecord, CareRecordId> {

  /** No sale del nombre del método —hay filtro, orden y límite—, así que va como `@Query`. */
  @Query(
    """
    SELECT c FROM CareRecord c
    WHERE c.plant.id = :plantId
      AND c.waterAmountMl > 0
      AND c.recordedAt <= :notAfter
    ORDER BY c.recordedAt DESC, c.id.id DESC
    LIMIT 1
    """,
  )
  override fun findLastWatering(plantId: PlantId, notAfter: Instant): CareRecord?
}

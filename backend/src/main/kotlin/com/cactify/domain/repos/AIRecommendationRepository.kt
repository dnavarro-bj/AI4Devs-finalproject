package com.cactify.domain.repos

import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecordId

/**
 * Puerto de acceso a recomendaciones de IA. Incluye la consulta que el listado de lecturas usa para
 * resolverlas **por página** en lugar de una por fila.
 */
interface AIRecommendationRepository {
  fun save(recommendation: AIRecommendation): AIRecommendation
  fun findOneByCareRecordId(careRecordId: CareRecordId): AIRecommendation?
  fun findAllByCareRecordIdIn(ids: Collection<CareRecordId>): List<AIRecommendation>
}

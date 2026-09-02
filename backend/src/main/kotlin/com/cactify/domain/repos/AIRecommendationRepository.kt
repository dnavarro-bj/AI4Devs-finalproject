package com.cactify.domain.repos

import com.cactify.domain.AIRecommendation
import com.cactify.domain.CareRecordId

/**
 * Puerto de acceso a recomendaciones de IA. Por ahora solo lectura, y solo la consulta que el
 * listado de lecturas necesita para resolverlas **por página** en lugar de una por fila. T-04 lo
 * ampliará con la escritura.
 */
interface AIRecommendationRepository {
  fun findAllByCareRecordIdIn(ids: Collection<CareRecordId>): List<AIRecommendation>
}

/** El análisis de IA de una lectura. */

/** Los `CHECK` de `V5__ai_recommendation_constraints.sql` garantizan estos valores. */
export type RiskLevel = 'low' | 'medium' | 'high'
export type Priority = 'immediate' | 'soon' | 'routine'

export interface Recommendation {
  id: string
  careRecordId: string
  riskLevel: RiskLevel
  explanation: string
  recommendedAction: string
  priority: Priority
  createdAt: string | null
}

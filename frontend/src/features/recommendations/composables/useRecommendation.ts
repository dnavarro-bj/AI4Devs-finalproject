import { recommendationsApiService } from '../services/recommendations.api.service'

/** El análisis de IA de una lectura. */
export function useRecommendation() {
  const generate = (plantId: string, careRecordId: string) =>
    recommendationsApiService.generate(plantId, careRecordId)

  const fetchExisting = (plantId: string, careRecordId: string) =>
    recommendationsApiService.fetchExisting(plantId, careRecordId)

  return { generate, fetchExisting }
}

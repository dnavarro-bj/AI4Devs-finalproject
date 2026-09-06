import type { PlantDetail } from '@features/plants/types/plant.types'
import type { SpeciesCare } from '@features/species/types/species.types'
import type { CareRecord } from '@features/care-records/types/careRecord.types'
import type { Recommendation } from '@features/recommendations/types/recommendation.types'

export const speciesCare = (overrides: Partial<SpeciesCare> = {}): SpeciesCare => ({
  id: '200001',
  scientificName: 'Echinocactus grusonii',
  commonName: 'Asiento de suegra',
  minHumidity: 10,
  maxHumidity: 30,
  minTemperature: 10,
  maxTemperature: 35,
  minLightHours: 6,
  maxLightHours: 10,
  wateringGuideline: 'cada 10-20 dias',
  ...overrides,
})

export const plantDetail = (overrides: Partial<PlantDetail> = {}): PlantDetail => ({
  id: '882687672222443468',
  nickname: 'Bola verde',
  createdAt: '2026-09-01T10:00:00Z',
  location: { id: '300001', name: 'Invernadero 1' },
  species: speciesCare(),
  tags: [{ id: '400001', name: 'globular' }],
  ...overrides,
})

export const careRecord = (overrides: Partial<CareRecord> = {}): CareRecord => ({
  id: '500001',
  plantId: '882687672222443468',
  recordedAt: '2026-09-02T09:00:00Z',
  humidity: 8,
  temperature: 22,
  lightHours: 7,
  waterAmountMl: null,
  soilPh: null,
  recommendation: null,
  ...overrides,
})

export const recommendation = (overrides: Partial<Recommendation> = {}): Recommendation => ({
  id: '600001',
  careRecordId: '500001',
  riskLevel: 'high',
  explanation: 'La humedad está por debajo del rango recomendado.',
  recommendedAction: 'Riega en profundidad y revisa el drenaje.',
  priority: 'immediate',
  createdAt: '2026-09-02T09:05:00Z',
  ...overrides,
})

import type { SpeciesCare } from '@features/species/types/species.types'
import type { CareRecordInput } from '../types/careRecord.types'

/**
 * Los cinco valores de una lectura tal como los escribe el usuario: texto, vacío hasta que se
 * informan. Los comparten la alta de una lectura (`CareRecordForm`) y el lote, de modo que **los
 * campos, sus unidades y su validación no pueden divergir**.
 */
export type ReadingValues = Record<keyof Omit<CareRecordInput, 'recordedAt'>, string>

export const emptyReadingValues = (): ReadingValues => ({
  humidity: '',
  temperature: '',
  lightHours: '',
  waterAmountMl: '',
  soilPh: '',
})

/** La unidad vive en el control y fuera del valor: nunca se cuela en lo que se envía. */
export const READING_FIELDS: {
  key: keyof ReadingValues
  label: string
  unit: string
  test: string
  mark: string
  range?: (species: SpeciesCare) => string
}[] = [
  { key: 'humidity', label: 'Humedad', unit: '%', test: 'humidity', mark: '◫', range: (s) => `Recomendada ${s.minHumidity}–${s.maxHumidity} %` },
  { key: 'temperature', label: 'Temperatura', unit: '°C', test: 'temperature', mark: '♨', range: (s) => `Recomendada ${s.minTemperature}–${s.maxTemperature} °C` },
  { key: 'lightHours', label: 'Horas de luz', unit: 'h', test: 'lightHours', mark: '☼', range: (s) => `Recomendadas ${s.minLightHours}–${s.maxLightHours} h` },
  { key: 'waterAmountMl', label: 'Cantidad de riego', unit: 'ml', test: 'waterAmountMl', mark: '◇', range: () => 'Déjalo vacío si hoy no has regado.' },
  { key: 'soilPh', label: 'Acidez del sustrato', unit: 'pH', test: 'soilPh', mark: 'pH' },
]

/** Solo los valores informados: un campo vacío se omite, nunca se manda a cero (`null` y `0` son cosas distintas en el riego). */
export function readingInput(values: ReadingValues): Omit<CareRecordInput, 'recordedAt'> {
  const input: Omit<CareRecordInput, 'recordedAt'> = {}
  for (const [field, raw] of Object.entries(values)) {
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value === '') continue

    const parsed = Number(value)
    if (!Number.isNaN(parsed)) input[field as keyof ReadingValues] = parsed
  }
  return input
}

import { describe, expect, it } from 'vitest'
import {
  ORIGIN_LABELS,
  careToOverrides,
  toProfile,
  PLANT_STATUSES,
  STATUS_LABELS,
  allowedTransitions,
  germinationLabel,
  isFinalStatus,
  reasonRequired,
} from './plantProfile'

/** El espejo de la regla del dominio: lo que la interfaz ofrece. El servidor la vuelve a comprobar. */
describe('plantProfile: estados', () => {
  const inProgress = ['activa', 'cuarentena', 'enferma'] as const
  const finals = ['cedida', 'vendida', 'muerta', 'perdida'] as const

  it('son siete estados con su texto', () => {
    expect(PLANT_STATUSES).toEqual([...inProgress, ...finals])
    for (const status of PLANT_STATUSES) expect(STATUS_LABELS[status]).toBeTruthy()
  })

  it('distingue los finales de los que están en curso', () => {
    for (const status of finals) expect(isFinalStatus(status)).toBe(true)
    for (const status of inProgress) expect(isFinalStatus(status)).toBe(false)
  })

  it('desde un estado en curso se ofrece cualquier otro', () => {
    expect(allowedTransitions('activa')).toEqual(['cuarentena', 'enferma', ...finals])
    expect(allowedTransitions('enferma')).toEqual(['activa', 'cuarentena', ...finals])
  })

  it('desde un estado final solo se ofrece volver a activa', () => {
    for (const status of finals) expect(allowedTransitions(status)).toEqual(['activa'])
  })

  it('nunca se ofrece el estado actual', () => {
    for (const status of PLANT_STATUSES) expect(allowedTransitions(status)).not.toContain(status)
  })

  it('el motivo es obligatorio solo al volver a activa desde un estado final', () => {
    for (const from of finals) expect(reasonRequired(from, 'activa')).toBe(true)
    expect(reasonRequired('enferma', 'activa')).toBe(false)
    expect(reasonRequired('activa', 'muerta')).toBe(false)
  })
})

describe('plantProfile: procedencia', () => {
  it('cada procedencia de la lista tiene su texto', () => {
    expect(Object.keys(ORIGIN_LABELS)).toEqual([
      'vivero', 'intercambio', 'germinacion_propia', 'compra', 'regalo', 'otro',
    ])
    expect(ORIGIN_LABELS.germinacion_propia).toBe('Germinación propia')
  })
})

describe('plantProfile: germinación', () => {
  it('con año y mes dice el mes con dos cifras', () => {
    expect(germinationLabel(2021, 4, 2026)).toBe('Germinada 04/2021')
    expect(germinationLabel(2021, 12, 2026)).toBe('Germinada 12/2021')
  })

  it('solo con el año dice el año y una edad aproximada, sin inventar un mes', () => {
    expect(germinationLabel(2021, undefined, 2026)).toBe('Germinada en 2021 · ~5 años')
    expect(germinationLabel(2021, null, 2026)).toBe('Germinada en 2021 · ~5 años')
  })

  it('la edad aproximada singulariza el año y no inventa edad en el año en curso', () => {
    expect(germinationLabel(2025, undefined, 2026)).toBe('Germinada en 2025 · ~1 año')
    expect(germinationLabel(2026, undefined, 2026)).toBe('Germinada en 2026 · este año')
  })

  it('sin año no hay germinación que contar', () => {
    expect(germinationLabel(undefined, undefined, 2026)).toBeNull()
    expect(germinationLabel(null, null, 2026)).toBeNull()
  })

  it('un año futuro no produce una edad negativa', () => {
    expect(germinationLabel(2030, undefined, 2026)).toBe('Germinada en 2030')
  })
})

describe('plantProfile: del formulario al API', () => {
  const empty = { description: '', germinationYear: '', germinationMonth: '', acquiredOn: '', origin: '', originNote: '' }

  it('un formulario vacío no envía ningún dato de la ficha', () => {
    expect(toProfile(empty)).toEqual({})
  })

  it('convierte año y mes en números y recorta los textos', () => {
    expect(toProfile({
      description: '  Adulto  ', germinationYear: '2021', germinationMonth: '4',
      acquiredOn: '2022-03-01', origin: 'intercambio', originNote: ' Con un vecino ',
    })).toEqual({
      description: 'Adulto', germinationYear: 2021, germinationMonth: 4,
      acquiredOn: '2022-03-01', origin: 'intercambio', originNote: 'Con un vecino',
    })
  })

  it('solo con el año no inventa un mes', () => {
    expect(toProfile({ ...empty, germinationYear: '2021' })).toEqual({ germinationYear: 2021 })
  })

  it('un mes sin año se descarta: sin año no significa nada', () => {
    expect(toProfile({ ...empty, germinationMonth: '4' })).toEqual({})
  })
})

describe('plantProfile: cuidados propios del formulario al API', () => {
  const noCare = { minHumidity: '', maxHumidity: '', minTemperature: '', maxTemperature: '', minLightHours: '', maxLightHours: '', wateringGuideline: '', soilMixId: '' }

  it('sin ningún valor no hay cuidados propios', () => {
    expect(careToOverrides(noCare)).toBeUndefined()
  })

  it('solo viaja lo rellenado, convertido a número donde toca', () => {
    expect(careToOverrides({ ...noCare, wateringGuideline: ' cada 5 dias ', maxTemperature: '30' })).toEqual({
      wateringGuideline: 'cada 5 dias', maxTemperature: 30,
    })
  })

  it('la mezcla viaja por identificador', () => {
    expect(careToOverrides({ ...noCare, soilMixId: '100002' })).toEqual({ soilMixId: '100002' })
  })

  it('un cero es un valor, no una ausencia', () => {
    expect(careToOverrides({ ...noCare, minLightHours: '0' })).toEqual({ minLightHours: 0 })
  })

  it('con la personalización desactivada no se envía nada, aunque queden valores escritos', () => {
    const profile = toProfile({
      description: '', germinationYear: '', germinationMonth: '', acquiredOn: '', origin: '', originNote: '',
      careEnabled: false, care: { ...noCare, wateringGuideline: 'cada 5 dias' },
    })

    expect(profile).toEqual({})
  })

  it('con la personalización activa y valores, van dentro de la ficha', () => {
    const profile = toProfile({
      description: '', germinationYear: '', germinationMonth: '', acquiredOn: '', origin: '', originNote: '',
      careEnabled: true, care: { ...noCare, wateringGuideline: 'cada 5 dias' },
    })

    expect(profile).toEqual({ careOverrides: { wateringGuideline: 'cada 5 dias' } })
  })

  it('activa pero sin ningún valor equivale a no personalizar', () => {
    const profile = toProfile({
      description: '', germinationYear: '', germinationMonth: '', acquiredOn: '', origin: '', originNote: '',
      careEnabled: true, care: noCare,
    })

    expect(profile).toEqual({})
  })
})

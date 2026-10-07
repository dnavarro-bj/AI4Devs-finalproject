import { describe, expect, it } from 'vitest'
import type { LocationDetail } from '../types/location.types'
import { emptyLocationInput, locationToInput, occupancyOf } from './locationInput'

const detail = (overrides: Partial<LocationDetail> = {}): LocationDetail => ({
  id: '2', name: 'Bancada norte', code: 'LOC-I1-BN', parentId: '1', description: null,
  locationType: 'bancada', capacity: 250, operationalNotes: null, environment: 'cubierto',
  sunExposure: 'semisombra', ancestors: [{ id: '1', name: 'Invernadero 1' }], children: [],
  plantCount: 4, plantCountTotal: 62, ...overrides,
})

describe('locationToInput', () => {
  it('parte de todo lo guardado, porque el PUT es reemplazo completo', () => {
    expect(locationToInput(detail())).toEqual({
      name: 'Bancada norte', code: 'LOC-I1-BN', parentId: '1', description: '',
      locationType: 'bancada', capacity: 250, operationalNotes: '', environment: 'cubierto',
      sunExposure: 'semisombra',
    })
  })

  it('lo sin definir queda vacío o nulo, no «null» en un campo de texto', () => {
    const input = locationToInput(detail({ description: null, operationalNotes: null, capacity: null, environment: null }))

    expect(input.description).toBe('')
    expect(input.operationalNotes).toBe('')
    expect(input.capacity).toBeNull()
    expect(input.environment).toBeNull()
  })
})

describe('emptyLocationInput', () => {
  it('es una raíz salvo que se indique un padre', () => {
    expect(emptyLocationInput().parentId).toBeNull()
    expect(emptyLocationInput('7').parentId).toBe('7')
  })
})

describe('occupancyOf', () => {
  it('redondea el porcentaje sobre la capacidad', () => {
    expect(occupancyOf(183, 250)).toBe(73)
  })

  it('sin capacidad no hay proporción', () => {
    expect(occupancyOf(183, null)).toBeNull()
    expect(occupancyOf(5, 0)).toBeNull()
  })

  it('una localización por encima de su capacidad supera el 100 %', () => {
    expect(occupancyOf(300, 250)).toBe(120)
  })
})

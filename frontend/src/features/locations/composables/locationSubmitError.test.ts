import { describe, expect, it } from 'vitest'
import { domainError, ErrorCodes } from '@shared/types/api.types'
import { locationSubmitError } from './locationSubmitError'

describe('locationSubmitError', () => {
  it('un código repetido va al campo del código', () => {
    const result = locationSubmitError(domainError(ErrorCodes.CONFLICT, "El código 'LOC-I1' ya lo usa otra localización", 409))

    expect(result.field).toBe('code')
  })

  it('un ciclo va al padre', () => {
    const result = locationSubmitError(domainError(ErrorCodes.CONFLICT, 'Una localización no puede ser hija de sí misma ni de sus descendientes', 409))

    expect(result.field).toBe('parent')
  })

  it('un padre inexistente va al padre', () => {
    const result = locationSubmitError(domainError(ErrorCodes.VALIDATION_ERROR, "El padre '999' no existe", 400))

    expect(result.field).toBe('parent')
  })

  it('un nombre en blanco va al nombre', () => {
    expect(locationSubmitError(domainError(ErrorCodes.VALIDATION_ERROR, 'name: el nombre es obligatorio', 400)).field).toBe('name')
  })

  it('lo que no se reconoce queda sin campo, con su mensaje', () => {
    const result = locationSubmitError(domainError(ErrorCodes.SERVER_ERROR, 'Algo falló', 500))

    expect(result).toEqual({ field: null, message: 'Algo falló' })
  })
})

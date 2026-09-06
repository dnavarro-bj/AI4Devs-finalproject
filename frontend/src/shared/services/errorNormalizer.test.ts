// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError } from '@shared/services/httpClient'
import { isNotFound, normalizeError } from '@shared/services/errorNormalizer'
import { domainError, ErrorCodes, fail, ok } from '@shared/types/api.types'

/** La frontera entre transporte y dominio de ADR-015. */
describe('normalizeError', () => {
  it('conserva el mensaje pintable del API', () => {
    const error = normalizeError(new ApiError(400, 'La humedad debe estar entre 0 y 100'))

    expect(error.message).toBe('La humedad debe estar entre 0 y 100')
    expect(error.status).toBe(400)
  })

  it.each([
    [404, ErrorCodes.NOT_FOUND],
    [409, ErrorCodes.CONFLICT],
    [502, ErrorCodes.UPSTREAM_ERROR],
    [400, ErrorCodes.VALIDATION_ERROR],
    [422, ErrorCodes.VALIDATION_ERROR],
    [500, ErrorCodes.SERVER_ERROR],
  ])('traduce el status %i a %s', (status, code) => {
    expect(normalizeError(new ApiError(status, 'x')).code).toBe(code)
  })

  it('el fallo de red no tiene status que interpretar', () => {
    // `httpClient` usa `0` cuando no hubo respuesta ninguna.
    const error = normalizeError(new ApiError(0, 'sin respuesta'))

    expect(error.code).toBe(ErrorCodes.NETWORK_ERROR)
  })

  it('nunca deja escapar algo que no sea un DomainError', () => {
    const error = normalizeError(new TypeError('roto'))

    expect(error.code).toBe(ErrorCodes.UNKNOWN)
    expect(error.message).toBe('roto')
    expect(error.status).toBeUndefined()
  })
})

describe('ServiceResponse', () => {
  it('el éxito lleva dato y ningún error', () => {
    expect(ok(42)).toEqual({ success: true, data: 42, error: null })
  })

  it('el fallo lleva error y ningún dato', () => {
    const error = domainError(ErrorCodes.NOT_FOUND, 'no existe', 404)

    expect(fail(error)).toEqual({ success: false, data: null, error })
  })

  it('reconoce el 404 de «todavía no existe», que no siempre es un error de la pantalla', () => {
    expect(isNotFound(domainError(ErrorCodes.NOT_FOUND, 'x', 404))).toBe(true)
    expect(isNotFound(domainError(ErrorCodes.SERVER_ERROR, 'x', 500))).toBe(false)
    expect(isNotFound(null)).toBe(false)
  })
})

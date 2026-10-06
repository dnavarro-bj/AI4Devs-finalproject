import { describe, expect, it } from 'vitest'
import { ErrorCodes, domainError } from '@shared/types/api.types'
import { speciesSubmitError } from './speciesSubmitError'

/** El `409` es de dos campos posibles: el API los distingue por el mensaje. */
describe('speciesSubmitError', () => {
  it('un 409 que habla del código se ata al campo Código', () => {
    const error = domainError(ErrorCodes.CONFLICT, "Ya existe una especie con el código 'CAT-GRUSS'", 409)

    expect(speciesSubmitError(error).field).toBe('code')
  })

  it('un 409 por código bloqueado por ejemplares también es del campo Código', () => {
    const error = domainError(ErrorCodes.CONFLICT, "El código 'CAT-GRUSS' ya identifica ejemplares", 409)

    expect(speciesSubmitError(error).field).toBe('code')
  })

  it('un 409 por nombre científico se ata a ese campo', () => {
    const error = domainError(ErrorCodes.CONFLICT, "Ya existe una especie con el nombre científico 'X y'", 409)

    expect(speciesSubmitError(error).field).toBe('scientificName')
  })

  it('un 400 que habla del código es del campo Código', () => {
    const error = domainError(ErrorCodes.VALIDATION_ERROR, 'code: el código es obligatorio', 400)

    expect(speciesSubmitError(error).field).toBe('code')
  })

  it('cualquier otro fallo no se ata a ningún campo y conserva su mensaje', () => {
    const error = domainError(ErrorCodes.SERVER_ERROR, 'No se ha podido completar la operación.', 500)

    expect(speciesSubmitError(error)).toEqual({ field: null, message: 'No se ha podido completar la operación.' })
  })
})

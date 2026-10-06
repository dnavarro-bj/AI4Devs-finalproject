import { describe, expect, it } from 'vitest'
import { suggestSpeciesCode } from './speciesCodeSuggestion'

describe('suggestSpeciesCode', () => {
  it('toma las cinco primeras letras del género, con el prefijo de la colección', () => {
    expect(suggestSpeciesCode('Echinocactus grusonii')).toBe('CAT-ECHIN')
    expect(suggestSpeciesCode('Mammillaria elongata')).toBe('CAT-MAMMI')
  })

  it('un género más corto de cinco letras se usa entero', () => {
    expect(suggestSpeciesCode('Ario fissuratus')).toBe('CAT-ARIO')
  })

  it('ignora mayúsculas, espacios sobrantes y diacríticos', () => {
    expect(suggestSpeciesCode('  échinocactus   GRUSONII ')).toBe('CAT-ECHIN')
    expect(suggestSpeciesCode('Cereus peruvianus')).toBe('CAT-CEREU')
  })

  it('un nombre de una sola palabra usa esa palabra', () => {
    expect(suggestSpeciesCode('Echeveria')).toBe('CAT-ECHEV')
  })

  it('descarta lo que no son letras del género: cifras, signos e híbridos', () => {
    expect(suggestSpeciesCode('× Gasteraloe hybrida')).toBe('CAT-GASTE')
    expect(suggestSpeciesCode('Opuntia-2 x')).toBe('CAT-OPUNT')
  })

  it('sin nombre, o sin ninguna letra, no propone nada', () => {
    expect(suggestSpeciesCode('')).toBe('')
    expect(suggestSpeciesCode('   ')).toBe('')
    expect(suggestSpeciesCode('123 456')).toBe('')
  })

  it('la propuesta siempre cumple el formato del código', () => {
    for (const name of ['Echinocactus grusonii', 'Ñandú rojo', 'Schlumbergera truncata']) {
      const code = suggestSpeciesCode(name)
      expect(code).toMatch(/^[A-Z0-9]+(-[A-Z0-9]+)*$/)
      expect(code.length).toBeLessThanOrEqual(20)
    }
  })
})

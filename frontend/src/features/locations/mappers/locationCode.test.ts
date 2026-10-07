import { describe, expect, it } from 'vitest'
import { suggestLocationCode } from './locationCode'

describe('suggestLocationCode', () => {
  it('una raíz toma las iniciales de su nombre, con los números enteros', () => {
    expect(suggestLocationCode('Invernadero 1')).toBe('LOC-I1')
  })

  it('una localización anidada cuelga del código de su padre', () => {
    expect(suggestLocationCode('Bancada norte', 'LOC-I1')).toBe('LOC-I1-BN')
  })

  it('un nombre de una sola palabra usa sus tres primeras letras', () => {
    expect(suggestLocationCode('Cuarentena')).toBe('LOC-CUA')
  })

  it('ignora acentos y signos', () => {
    expect(suggestLocationCode('Estantería ¡sur!')).toBe('LOC-ES')
  })

  it('sin nombre no hay propuesta', () => {
    expect(suggestLocationCode('   ')).toBe('')
    expect(suggestLocationCode('', 'LOC-I1')).toBe('')
  })

  it('un padre cuyo código no lleva el prefijo se usa entero', () => {
    expect(suggestLocationCode('Bandeja A3', 'ZONA-2')).toBe('LOC-ZONA-2-BA3')
  })
})

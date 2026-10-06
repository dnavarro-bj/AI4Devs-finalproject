import { describe, expect, it } from 'vitest'
import { SCALES, validateRange } from './careRanges'

/**
 * El validador de los rangos de cuidado (humedad, temperatura, horas de luz). Es una comprobación de
 * rango, permitida en el borde (ADR-011): evita un viaje para algo que se sabe sin preguntar; el
 * servidor la repite y su mensaje manda si diverge.
 */
describe('validateRange', () => {
  it('un rango coherente dentro de su escala es válido', () => {
    expect(validateRange('humidity', '10', '30')).toBe('')
    expect(validateRange('temperature', '-5', '35')).toBe('')
    expect(validateRange('light', '0', '24')).toBe('')
  })

  it('los extremos de la escala son válidos', () => {
    expect(validateRange('humidity', '0', '100')).toBe('')
    expect(validateRange('light', '0', '24')).toBe('')
    expect(validateRange('temperature', String(SCALES.temperature.min), String(SCALES.temperature.max))).toBe('')
  })

  it('un mínimo igual al máximo es válido', () => {
    expect(validateRange('humidity', '20', '20')).toBe('')
  })

  it('un mínimo por encima del máximo se rechaza nombrando el concepto', () => {
    expect(validateRange('humidity', '80', '20')).toContain('humedad')
    expect(validateRange('humidity', '80', '20')).toContain('no puede superar')
    expect(validateRange('temperature', '40', '10')).toContain('temperatura')
    expect(validateRange('light', '12', '6')).toContain('luz')
  })

  it('la humedad fuera de 0 a 100 se rechaza en cualquiera de los dos extremos', () => {
    expect(validateRange('humidity', '-1', '30')).toContain('entre 0 y 100')
    expect(validateRange('humidity', '10', '101')).toContain('entre 0 y 100')
  })

  it('las horas de luz fuera de 0 a 24 se rechazan', () => {
    expect(validateRange('light', '-1', '10')).toContain('entre 0 y 24')
    expect(validateRange('light', '5', '25')).toContain('entre 0 y 24')
  })

  it('una temperatura implausible se rechaza', () => {
    expect(validateRange('temperature', '-80', '10')).toContain('temperatura')
    expect(validateRange('temperature', '10', '200')).toContain('temperatura')
  })

  it('un valor que no es un número entero se rechaza', () => {
    expect(validateRange('humidity', 'abc', '30')).toContain('número entero')
    expect(validateRange('humidity', '10.5', '30')).toContain('número entero')
    expect(validateRange('light', '1e2', '30')).toContain('número entero')
  })

  it('un extremo vacío se ignora: no hay nada que comprobar', () => {
    expect(validateRange('humidity', '', '')).toBe('')
    expect(validateRange('humidity', '20', '')).toBe('')
    expect(validateRange('humidity', '', '80')).toBe('')
  })

  it('un cero es un valor, no una ausencia', () => {
    expect(validateRange('humidity', '0', '')).toBe('')
    expect(validateRange('light', '0', '-1')).toContain('entre 0 y 24')
  })

  describe('con valores heredados', () => {
    it('un mínimo propio se juzga contra el máximo heredado', () => {
      expect(validateRange('humidity', '40', '', { min: 10, max: 30 })).toContain('no puede superar')
    })

    it('un máximo propio se juzga contra el mínimo heredado', () => {
      expect(validateRange('temperature', '', '5', { min: 10, max: 35 })).toContain('no puede superar')
    })

    it('un extremo propio coherente con el heredado es válido', () => {
      expect(validateRange('humidity', '12', '', { min: 10, max: 30 })).toBe('')
      expect(validateRange('light', '', '8', { min: 6, max: 10 })).toBe('')
    })

    it('los dos extremos propios se juzgan entre sí, no contra los heredados', () => {
      expect(validateRange('light', '2', '4', { min: 6, max: 10 })).toBe('')
      expect(validateRange('light', '8', '4', { min: 6, max: 10 })).toContain('no puede superar')
    })

    it('sin ningún extremo propio no hay nada que comprobar aunque el heredado sea raro', () => {
      expect(validateRange('humidity', '', '', { min: 90, max: 10 })).toBe('')
    })
  })
})

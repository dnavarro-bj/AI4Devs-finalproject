import { describe, expect, it } from 'vitest'
import { readUrlState, toUrlQuery, type UrlSchema } from './urlState'

const schema = {
  q: { kind: 'text' },
  status: { kind: 'enum', values: ['activa', 'muerta', 'all'] },
  tag: { kind: 'list' },
  exposure: { kind: 'list', values: ['sombra', 'pleno_sol'] },
  includeDescendants: { kind: 'flag' },
} as const satisfies UrlSchema

describe('readUrlState', () => {
  it('lee cada tipo de parámetro', () => {
    expect(readUrlState(schema, {
      q: 'suegra',
      status: 'muerta',
      tag: ['a', 'b'],
      exposure: 'pleno_sol',
      includeDescendants: 'true',
    })).toEqual({
      q: 'suegra',
      status: 'muerta',
      tag: ['a', 'b'],
      exposure: ['pleno_sol'],
      includeDescendants: true,
    })
  })

  it('lo ausente toma el valor por defecto de su tipo', () => {
    expect(readUrlState(schema, {})).toEqual({
      q: '', status: '', tag: [], exposure: [], includeDescendants: false,
    })
  })

  it('descarta lo inválido y lo desconocido sin romper', () => {
    expect(readUrlState(schema, {
      status: 'resucitada',
      exposure: ['playa', 'sombra'],
      includeDescendants: 'quizá',
      colour: 'red',
    })).toEqual({
      q: '', status: '', tag: [], exposure: ['sombra'], includeDescendants: false,
    })
  })

  it('un texto repetido toma el primero y las listas no repiten valores', () => {
    const state = readUrlState(schema, { q: ['uno', 'dos'], tag: ['a', 'a', 'b'] })
    expect(state.q).toBe('uno')
    expect(state.tag).toEqual(['a', 'b'])
  })

  it('ignora los valores nulos o vacíos', () => {
    expect(readUrlState(schema, { q: null, tag: ['', 'a'], status: '' }).tag).toEqual(['a'])
  })
})

describe('toUrlQuery', () => {
  it('omite los valores por defecto', () => {
    expect(toUrlQuery(schema, readUrlState(schema, {}))).toEqual({})
  })

  it('escribe lo que tiene valor, con las listas como repetidos y los flags como «true»', () => {
    expect(toUrlQuery(schema, {
      q: 'suegra', status: 'all', tag: ['a', 'b'], exposure: ['sombra'], includeDescendants: true,
    })).toEqual({
      q: 'suegra', status: 'all', tag: ['a', 'b'], exposure: ['sombra'], includeDescendants: 'true',
    })
  })

  it('leer lo escrito devuelve el mismo estado', () => {
    const state = { q: 'x', status: 'activa', tag: ['a'], exposure: ['sombra'], includeDescendants: true }
    expect(readUrlState(schema, toUrlQuery(schema, state))).toEqual(state)
  })
})

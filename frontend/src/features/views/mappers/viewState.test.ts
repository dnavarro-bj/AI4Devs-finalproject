import { describe, expect, it } from 'vitest'
import type { SavedView } from '../types/view.types'
import { groupSymbol, plantsDraft, plantsRouteQuery, sameDraft, speciesDraft, speciesRouteQuery } from './viewState'

/**
 * La traducción entre el estado de una pantalla y lo que se guarda. Lo que no es lenguaje del API
 * —`hide`, el pseudo-valor `status=all`— nunca entra en una vista ni en su comparación.
 */

const STATUSES = ['activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida']
const HIDEABLE = ['species', 'location', 'status', 'lastWatering', 'attention']
const context = { statuses: STATUSES, hideable: HIDEABLE }

const view = (over: Partial<SavedView>): SavedView => ({
  id: '1', scope: 'plants', name: 'v', query: '', createdAt: '', updatedAt: '', ...over,
})

describe('estado del inventario → vista', () => {
  it('la consulta es la canónica del estado, sin lo que no es del API', () => {
    const draft = plantsDraft({ q: 'x', sort: 'code,asc', hide: ['status'], tag: 'globular' }, context)

    expect(draft.query).toBe('q=x&sort=code,asc&tag=globular')
  })

  it('las columnas guardadas son las visibles: las configurables menos las ocultas', () => {
    expect(plantsDraft({ hide: ['status', 'attention'] }, context).columns).toEqual(['species', 'location', 'lastWatering'])
  })

  it('sin columnas ocultas se guardan todas las configurables, explícitas', () => {
    expect(plantsDraft({}, context).columns).toEqual(HIDEABLE)
  })

  it('«todos los estados» se expande a los estados reales: el API no conoce `all`', () => {
    const draft = plantsDraft({ status: 'all' }, context)

    expect(draft.query).toBe(STATUSES.slice().sort().map((status) => `status=${status}`).join('&'))
    expect(draft.query).not.toContain('all')
  })

  it('un estado concreto se guarda tal cual', () => {
    expect(plantsDraft({ status: 'cuarentena' }, context).query).toBe('status=cuarentena')
  })
})

describe('vista → estado del inventario', () => {
  it('reproduce los criterios y calcula las ocultas con el inverso de las visibles', () => {
    const route = plantsRouteQuery(view({ query: 'q=x&species=7&sort=code%2Casc', columns: ['species', 'location'] }), context)

    expect(route).toEqual({
      q: ['x'], species: ['7'], sort: ['code,asc'], hide: ['status', 'lastWatering', 'attention'],
    })
  })

  it('todos los estados vuelven a ser `all`', () => {
    const query = STATUSES.map((status) => `status=${status}`).join('&')

    expect(plantsRouteQuery(view({ query }), context).status).toEqual(['all'])
  })

  it('un solo estado vuelve como ese estado', () => {
    expect(plantsRouteQuery(view({ query: 'status=cuarentena' }), context).status).toEqual(['cuarentena'])
  })

  it('una vista sin columnas no oculta ninguna', () => {
    expect(plantsRouteQuery(view({ query: 'q=x' }), context).hide).toBeUndefined()
  })

  it('guardar y aplicar es un viaje de ida y vuelta', () => {
    const state = { q: 'x', status: 'all', sort: 'species,asc', hide: ['attention'], tag: 'globular' }

    const draft = plantsDraft(state, context)
    const back = plantsRouteQuery(view(draft), context)

    expect(plantsDraft(back, context)).toEqual(draft)
  })
})

describe('grupos de especies', () => {
  it('la consulta del estado es la canónica', () => {
    expect(speciesDraft({ minTemperatureFrom: '9', exposure: 'semisombra' }).query).toBe('exposure=semisombra&minTemperatureFrom=9')
  })

  it('un grupo vuelve a la ruta tal cual', () => {
    expect(speciesRouteQuery(view({ scope: 'species', query: 'growthMonth=12&growthMonth=1' }))).toEqual({ growthMonth: ['12', '1'] })
  })
})

describe('«aplicada»: comparar el estado con una vista', () => {
  it('coincide con la misma consulta aunque llegue en otro orden', () => {
    expect(sameDraft({ query: 'a=1&b=2' }, view({ query: 'b=2&a=1' }))).toBe(true)
  })

  it('no coincide si cambia un criterio', () => {
    expect(sameDraft({ query: 'a=1' }, view({ query: 'a=2' }))).toBe(false)
  })

  it('las columnas se comparan como conjunto, sin orden', () => {
    expect(sameDraft({ query: '', columns: ['b', 'a'] }, view({ columns: ['a', 'b'] }))).toBe(true)
    expect(sameDraft({ query: '', columns: ['a'] }, view({ columns: ['a', 'b'] }))).toBe(false)
  })

  it('una vista sin columnas no tiene opinión sobre ellas', () => {
    expect(sameDraft({ query: 'a=1', columns: ['a'] }, view({ query: 'a=1' }))).toBe(true)
  })
})

describe('símbolo de un grupo, derivado de su regla', () => {
  it('el sol para las exposiciones soleadas', () => {
    expect(groupSymbol('exposure=pleno_sol')).toBe('☼')
    expect(groupSymbol('exposure=soleado')).toBe('☼')
  })

  it('la media luna para sombra y semisombra', () => {
    expect(groupSymbol('exposure=semisombra')).toBe('◐')
    expect(groupSymbol('exposure=sombra')).toBe('◐')
  })

  it('uno neutro para cualquier otra regla', () => {
    expect(groupSymbol('minTemperatureFrom=9')).toBe('◇')
    expect(groupSymbol('')).toBe('◇')
  })

  it('con varias exposiciones, la regla no es de una sola luz: neutro', () => {
    expect(groupSymbol('exposure=sombra&exposure=pleno_sol')).toBe('◇')
  })
})

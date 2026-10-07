import { describe, expect, it } from 'vitest'
import vectors from '../../../../contracts/canonical-query.vectors.json'
import { canonicalQuery } from './canonicalQuery'

/**
 * La forma canónica de una consulta guardada. La regla está implementada también en el backend;
 * los vectores compartidos son lo que impide que las dos diverjan (decisión 2 del design).
 */
describe('canonicalQuery', () => {
  for (const vector of vectors.vectors) {
    it(vector.name, () => {
      expect(canonicalQuery(vector.input)).toBe(vector.expected)
    })
  }

  it('acepta el objeto de una ruta: un valor, varios, o nada', () => {
    expect(canonicalQuery({ tag: ['b', 'a'], q: 'x', status: undefined, location: null, page: '2' }))
      .toBe('q=x&tag=a&tag=b')
  })

  it('un objeto y su query string dan la misma forma', () => {
    expect(canonicalQuery({ species: '7', exposure: 'pleno_sol' })).toBe(canonicalQuery('exposure=pleno_sol&species=7'))
  })

  it('el signo de interrogación inicial no es parte de la consulta', () => {
    expect(canonicalQuery('?b=2&a=1')).toBe('a=1&b=2')
  })
})

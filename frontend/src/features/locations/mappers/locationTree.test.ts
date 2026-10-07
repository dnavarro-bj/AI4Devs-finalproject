import { describe, expect, it } from 'vitest'
import type { LocationSummary } from '../types/location.types'
import { buildLocationTree, descendantIds, filterLocationTree, locationOptions } from './locationTree'

const row = (overrides: Partial<LocationSummary> & Pick<LocationSummary, 'id' | 'name'>): LocationSummary => ({
  code: `LOC-${overrides.id}`,
  parentId: null,
  path: overrides.name,
  locationType: null,
  capacity: null,
  plantCount: 0,
  plantCountTotal: 0,
  ...overrides,
})

/** Invernadero 1 > Bancada norte > (Bandeja A3, Bandeja A4); y una raíz aparte. */
const rows = (): LocationSummary[] => [
  row({ id: '3', name: 'Bandeja A3', parentId: '2', path: 'Invernadero 1 / Bancada norte / Bandeja A3', locationType: 'bandeja', plantCount: 31, plantCountTotal: 31 }),
  row({ id: '1', name: 'Invernadero 1', locationType: 'invernadero', plantCount: 0, plantCountTotal: 62 }),
  row({ id: '4', name: 'Bandeja A4', parentId: '2', path: 'Invernadero 1 / Bancada norte / Bandeja A4', locationType: 'bandeja', plantCount: 27, plantCountTotal: 27 }),
  row({ id: '2', name: 'Bancada norte', parentId: '1', path: 'Invernadero 1 / Bancada norte', locationType: 'bancada', plantCount: 4, plantCountTotal: 62 }),
  row({ id: '5', name: 'Cuarentena', plantCount: 2, plantCountTotal: 2 }),
]

describe('buildLocationTree · alertas', () => {
  it('un nodo con alertas abiertas las dice en su detalle, con la carga de plantas', () => {
    const tree = buildLocationTree([
      row({ id: '1', name: 'Invernadero 1', plantCountTotal: 62, openAlerts: { count: 3, highestSeverity: 'critica' } }),
      row({ id: '2', name: 'Cuarentena', plantCountTotal: 1, openAlerts: { count: 1, highestSeverity: 'baja' } }),
    ])

    expect(tree.find((node) => node.id === '1')!.detail).toBe('62 plantas · 3 alertas')
    expect(tree.find((node) => node.id === '2')!.detail).toBe('1 planta · 1 alerta')
  })

  it('sin alertas abiertas el detalle sigue siendo solo la carga', () => {
    const tree = buildLocationTree([
      row({ id: '1', name: 'A', plantCountTotal: 4, openAlerts: { count: 0 } }),
      row({ id: '2', name: 'B', plantCountTotal: 4 }),
    ])

    expect(tree.map((node) => node.detail)).toEqual(['4 plantas', '4 plantas'])
  })
})

describe('buildLocationTree', () => {
  it('anida cada localización bajo su padre, sin importar el orden de llegada', () => {
    const tree = buildLocationTree(rows())

    expect(tree.map((node) => node.label)).toEqual(['Cuarentena', 'Invernadero 1'])
    const greenhouse = tree.find((node) => node.id === '1')!
    expect(greenhouse.children!.map((node) => node.label)).toEqual(['Bancada norte'])
    expect(greenhouse.children![0]!.children!.map((node) => node.label)).toEqual(['Bandeja A3', 'Bandeja A4'])
  })

  it('cada nodo lleva su carga total, contando a los descendientes', () => {
    const greenhouse = buildLocationTree(rows()).find((node) => node.id === '1')!

    expect(greenhouse.count).toBe(62)
    expect(greenhouse.detail).toContain('62 plantas')
    expect(greenhouse.children![0]!.count).toBe(62)
  })

  it('el símbolo sale del tipo, y una localización sin tipo lleva el genérico', () => {
    const tree = buildLocationTree(rows())

    expect(tree.find((node) => node.id === '1')!.mark).toBe('⌂')
    expect(tree.find((node) => node.id === '5')!.mark).toBe('⌖')
  })

  it('una localización cuyo padre no está cargado cuelga de la raíz en lugar de perderse', () => {
    const tree = buildLocationTree([row({ id: '9', name: 'Huérfana', parentId: '404' })])

    expect(tree.map((node) => node.id)).toEqual(['9'])
  })

  it('un catálogo vacío es un árbol vacío', () => {
    expect(buildLocationTree([])).toEqual([])
  })
})

describe('filterLocationTree', () => {
  it('deja las coincidencias con la ruta que lleva hasta ellas', () => {
    const filtered = filterLocationTree(buildLocationTree(rows()), 'A3')

    expect(filtered.map((node) => node.id)).toEqual(['1'])
    const bench = filtered[0]!.children![0]!
    expect(bench.label).toBe('Bancada norte')
    expect(bench.children!.map((node) => node.label)).toEqual(['Bandeja A3'])
  })

  it('busca también por código, sin distinguir mayúsculas', () => {
    const filtered = filterLocationTree(buildLocationTree(rows()), 'loc-5')

    expect(filtered.map((node) => node.id)).toEqual(['5'])
  })

  it('un texto en blanco no filtra nada', () => {
    const tree = buildLocationTree(rows())

    expect(filterLocationTree(tree, '   ')).toBe(tree)
  })

  it('sin coincidencias no queda ningún nodo', () => {
    expect(filterLocationTree(buildLocationTree(rows()), 'zzz')).toEqual([])
  })
})

describe('descendantIds', () => {
  it('incluye la propia localización y todo lo que cuelga de ella, a cualquier profundidad', () => {
    expect([...descendantIds(rows(), '1')].sort()).toEqual(['1', '2', '3', '4'])
  })

  it('una hoja solo se contiene a sí misma', () => {
    expect([...descendantIds(rows(), '3')]).toEqual(['3'])
  })
})

describe('locationOptions', () => {
  it('ofrece cada localización con su ruta como detalle y su código', () => {
    const options = locationOptions(rows())
    const tray = options.find((option) => option.value === '3')!

    expect(tray.title).toBe('Bandeja A3')
    expect(tray.detail).toBe('Invernadero 1 / Bancada norte / Bandeja A3')
    expect(tray.code).toBe('LOC-3')
  })

  it('excluye las localizaciones indicadas', () => {
    const options = locationOptions(rows(), new Set(['2', '3', '4']))

    expect(options.map((option) => option.value).sort()).toEqual(['1', '5'])
  })
})

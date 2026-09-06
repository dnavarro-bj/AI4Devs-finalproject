// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { NAVIGATION, sectionAddresses } from '@features/layout/navigation'

/**
 * Escenarios "Entradas agrupadas" y "Toda sección de la navegación es alcanzable" de la
 * requirement "Mapa de secciones" (`app-navigation`).
 *
 * El mapa es un módulo de datos y no marcado (decisión del design), así que se puede comprobar
 * sin montar nada. Que cada dirección declarada tenga además su página se comprueba en
 * `test/pending-section.spec.ts`, junto a las páginas que la satisfacen.
 */

describe('mapa de secciones', () => {
  it('reparte las entradas en las cuatro agrupaciones del producto', () => {
    expect(NAVIGATION.map((group) => group.label)).toEqual([
      'Colección',
      'Trabajo diario',
      'Catálogos',
      'Administración',
    ])
    expect(NAVIGATION.every((group) => group.entries.length > 0)).toBe(true)
  })

  it('ninguna entrada repite dirección', () => {
    const addresses = sectionAddresses()
    expect(addresses).toHaveLength(new Set(addresses).size)
  })

  it('la galería del kit no es una sección de producto', () => {
    expect(sectionAddresses()).not.toContain('/ui-kit')
  })
})

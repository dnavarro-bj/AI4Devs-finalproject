// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { HOME, NAVIGATION, isActiveSection, sectionAddresses } from '@features/layout/navigation'

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

  it('el Dashboard es la primera entrada, vive en la raíz y no pertenece a ninguna agrupación', () => {
    expect(HOME.to).toBe('/')
    expect(sectionAddresses()[0]).toBe('/')
    expect(NAVIGATION.flatMap((group) => group.entries).map((entry) => entry.to)).not.toContain('/')
  })

  it('el Dashboard solo se marca activo en la raíz, no en todas las secciones', () => {
    expect(isActiveSection('/', '/')).toBe(true)
    expect(isActiveSection('/', '/plants')).toBe(false)
    expect(isActiveSection('/', '/tasks/1')).toBe(false)
    expect(isActiveSection('/plants', '/plants/882687672222443468')).toBe(true)
  })

  it('ninguna entrada repite dirección', () => {
    const addresses = sectionAddresses()
    expect(addresses).toHaveLength(new Set(addresses).size)
  })

  it('la galería del kit no es una sección de producto', () => {
    expect(sectionAddresses()).not.toContain('/ui-kit')
  })
})

import { describe, expect, it } from 'vitest'
import { phQuality } from './phQuality'

/**
 * La lectura cualitativa del pH, en los bordes, que es donde estas escalas fallan.
 *
 * Vive en la feature y no en el kit: «ligeramente ácido» es conocimiento de cultivo, no de
 * presentación. Y es función pura, así que se prueba sin montar nada.
 */
describe('phQuality', () => {
  it('clasifica por el punto medio del rango, no por sus extremos', () => {
    // 5,8–6,8 tiene su medio en 6,3: ligeramente ácido, aunque el máximo roce el neutro.
    expect(phQuality(5.8, 6.8)).toBe('Ligeramente ácido')
    // Clasificar por el mínimo lo haría parecer más ácido de lo que es.
    expect(phQuality(5.8, 6.8)).not.toBe('Ácido')
  })

  it('un rango claramente ácido se llama ácido', () => {
    expect(phQuality(4.5, 5.2)).toBe('Ácido')
  })

  it('un rango en torno a 7 es neutro', () => {
    expect(phQuality(6.8, 7.2)).toBe('Neutro')
  })

  it('un rango por encima del neutro es alcalino', () => {
    expect(phQuality(7.5, 8.5)).toBe('Alcalino')
  })

  it('los extremos de cada tramo caen del lado que les toca, sin huecos', () => {
    // Justo en cada frontera: ningún valor puede quedarse sin lectura.
    for (const mid of [0, 5.4, 5.5, 6.7, 6.8, 7.2, 7.3, 14]) {
      expect(phQuality(mid, mid), `pH ${mid} sin lectura`).toBeTruthy()
    }
  })

  it('un rango de un solo punto también se lee', () => {
    expect(phQuality(6.5, 6.5)).toBe('Ligeramente ácido')
  })

  it('un rango invertido se lee igual: no es su trabajo validarlo', () => {
    // El formulario y el dominio ya lo rechazan; aquí solo se describe lo que llegue.
    expect(phQuality(7, 6)).toBe(phQuality(6, 7))
  })
})

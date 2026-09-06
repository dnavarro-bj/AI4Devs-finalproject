import { beforeEach, describe, expect, it } from 'vitest'
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'

/**
 * La ficha necesita el nombre de la planta en sus breadcrumbs, y ese nombre solo se conoce cuando
 * el API responde (ADR-013): la ruta no basta y `definePageMeta` estático tampoco. La página los
 * fija, el armazón los lee.
 */
describe('useBreadcrumbs', () => {
  beforeEach(() => useBreadcrumbs().clear())

  it('la página fija la ruta y el armazón la lee', () => {
    const { breadcrumbs, set } = useBreadcrumbs()

    set([{ label: 'Inventario', to: '/plants' }, { label: 'Bola verde' }])

    expect(useBreadcrumbs().breadcrumbs.value).toEqual([
      { label: 'Inventario', to: '/plants' },
      { label: 'Bola verde' },
    ])
    expect(breadcrumbs.value).toHaveLength(2)
  })

  it('se limpia al cambiar de pantalla, para que ninguna herede los de la anterior', () => {
    const { breadcrumbs, set, clear } = useBreadcrumbs()

    set([{ label: 'Inventario' }])
    clear()

    expect(breadcrumbs.value).toEqual([])
  })

  it('el estado es de solo lectura para quien lo consume: solo la pantalla lo fija', () => {
    const { breadcrumbs, set } = useBreadcrumbs()

    set([{ label: 'Inventario' }])
    // @ts-expect-error se comprueba justamente que escribir desde fuera no tiene efecto
    breadcrumbs.value = []

    expect(breadcrumbs.value).toEqual([{ label: 'Inventario' }])
  })
})

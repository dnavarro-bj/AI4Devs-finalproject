import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useUrlState } from './useUrlState'
import type { UrlSchema } from '../utils/urlState'

const schema = {
  q: { kind: 'text' },
  status: { kind: 'enum', values: ['activa', 'muerta'] },
  tag: { kind: 'list' },
  flag: { kind: 'flag' },
} as const satisfies UrlSchema

let captured: ReturnType<typeof useUrlState<typeof schema>>

const Harness = defineComponent({
  setup() {
    captured = useUrlState(schema)
    return () => h('div')
  },
})

const settle = async () => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** La ruta vigente del router, que es la que `replace` actualiza (la que leyó el composable es la de su montaje). */
const currentQuery = () => useRouter().currentRoute.value.query

describe('useUrlState', () => {
  afterEach(() => vi.restoreAllMocks())

  it('arranca con el estado de la URL, tipado y saneado', async () => {
    await mountSuspended(Harness, { route: '/plants?q=suegra&tag=a&tag=b&flag=true&status=resucitada&colour=red' })

    expect(captured.state).toEqual({ q: 'suegra', status: '', tag: ['a', 'b'], flag: true })
  })

  it('cambiar el estado escribe la URL con replace y no con push', async () => {
    await mountSuspended(Harness, { route: '/plants' })
    const router = useRouter()
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    captured.state.q = 'grusonii'
    captured.state.tag = ['x']
    await settle()

    expect(push).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalled()
    await vi.waitFor(() => expect(currentQuery()).toEqual({ q: 'grusonii', tag: ['x'] }))
  })

  it('volver al valor por defecto quita el parámetro de la URL', async () => {
    await mountSuspended(Harness, { route: '/plants?q=suegra&flag=true' })

    captured.state.q = ''
    captured.state.flag = false
    await settle()

    await vi.waitFor(() => expect(currentQuery()).toEqual({}))
  })

  it('un cambio de la URL desde fuera se lee de vuelta', async () => {
    await mountSuspended(Harness, { route: '/plants' })

    await useRouter().replace('/plants?q=otro&status=muerta')
    await settle()

    expect(captured.state.q).toBe('otro')
    expect(captured.state.status).toBe('muerta')
  })

  it('un estado que ya es el de la URL no la reescribe', async () => {
    await mountSuspended(Harness, { route: '/plants?q=suegra' })
    const replace = vi.spyOn(useRouter(), 'replace')

    captured.state.q = 'suegra'
    await settle()

    expect(replace).not.toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

/**
 * La URL es estado compartido entre tests: una página que siguiera montada reaccionaría a los
 * cambios de la siguiente. Cada test desmonta lo suyo.
 */
enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios nuevos de `plant-dashboard`: "Salida desde el inventario vacío" y los breadcrumbs de
 * "Orientación permanente en toda pantalla". El resto del inventario lo cubre
 * `plants-list.nuxt.spec.ts`, que este change no toca.
 */
describe('orientación del inventario', () => {
  beforeEach(() => {
    api.get.mockReset()
    useBreadcrumbs().clear()
  })

  const emptyPage: PageResponse<PlantSummary> = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    pageNumber: 0,
    pageSize: 25,
  }

  it('el inventario vacío ofrece una única acción, y lleva al alta', async () => {
    api.get.mockResolvedValue(emptyPage)
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const empty = wrapper.find('[data-test="empty"]')
    expect(empty.text().toLowerCase()).toContain('no hay ninguna planta')

    const actions = empty.findAll('a, button')
    expect(actions).toHaveLength(1)
    expect(actions[0]!.attributes('href')).toBe('/plants/new')
  })

  it('declara sus breadcrumbs y se marca como la pantalla actual', async () => {
    api.get.mockResolvedValue(emptyPage)
    await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(useBreadcrumbs().breadcrumbs.value).toEqual([{ label: 'Inventario' }])
  })
})

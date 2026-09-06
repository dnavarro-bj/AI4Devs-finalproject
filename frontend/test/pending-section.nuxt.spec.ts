import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PendingSection from '@features/layout/components/PendingSection.vue'
import NotFoundPage from '../app/error.vue'
import SpeciesPage from '../app/pages/species/index.vue'
import { sectionAddresses } from '@features/layout/navigation'
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'

/**
 * Escenarios "Sección pendiente de construir", "La orientación no se pierde" y "Toda sección de
 * la navegación es alcanzable" de la capability `app-navigation`.
 */

const PAGES_DIR = join(import.meta.dirname, '..', 'app', 'pages')

/** `/plants` → `pages/plants.vue` o `pages/plants/index.vue`; `/species/[id]` → `pages/species/[id].vue`. */
function hasPage(address: string): boolean {
  const relative = address.replace(/^\//, '')
  return existsSync(join(PAGES_DIR, `${relative}.vue`)) || existsSync(join(PAGES_DIR, relative, 'index.vue'))
}

describe('sección todavía no construida', () => {
  it('explica que la sección está por construir y dice qué ticket la construye', async () => {
    const wrapper = await mountSuspended(PendingSection, {
      props: { title: 'Especies', ticket: 'T-13' },
    })

    expect(wrapper.text()).toContain('Especies')
    expect(wrapper.text()).toContain('T-13')
    expect(wrapper.text().toLowerCase()).toContain('construir')
  })

  it('no simula datos: no pinta ninguna tabla ni listado', async () => {
    const wrapper = await mountSuspended(PendingSection, {
      props: { title: 'Especies', ticket: 'T-13' },
    })

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.findAll('tr')).toHaveLength(0)
  })

  it('cada página pendiente fija sus breadcrumbs y su cabecera', async () => {
    useBreadcrumbs().clear()
    const wrapper = await mountSuspended(SpeciesPage)

    expect(useBreadcrumbs().breadcrumbs.value.at(-1)?.label).toBe('Especies')
    expect(wrapper.find('h1').text()).toBe('Especies')

    useBreadcrumbs().clear()
  })

  it('toda dirección declarada en la navegación tiene su página', () => {
    expect(sectionAddresses().filter((address) => !hasPage(address))).toEqual([])
  })
})

/**
 * Escenario "Dirección desconocida" de la requirement "Direcciones estables de las secciones".
 */
describe('dirección desconocida', () => {
  it('indica que la dirección no existe y ofrece volver a una sección conocida', async () => {
    const wrapper = await mountSuspended(NotFoundPage, {
      props: { error: { statusCode: 404, message: 'Page not found' } },
    })

    expect(wrapper.text()).toContain('404')
    const back = wrapper.find('a')
    expect(back.exists()).toBe(true)
    expect(sectionAddresses()).toContain(back.attributes('href'))
  })

  it('no simula la pantalla que el usuario buscaba', async () => {
    const wrapper = await mountSuspended(NotFoundPage, {
      props: { error: { statusCode: 404, message: 'Page not found' } },
    })

    expect(wrapper.find('table').exists()).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DefaultLayout from '../app/layouts/default.vue'
import { useBreadcrumbs } from '../app/composables/useBreadcrumbs'

/**
 * Escenarios de la requirement "Armazón de la aplicación" (`design-system`) y de "Orientación
 * permanente en toda pantalla" (`plant-dashboard`).
 */
describe('armazón de la aplicación', () => {
  it('marca la sección activa con algo más que el color y la expone como actual', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/plants/1' })

    const active = wrapper.find('nav[aria-label="Navegación principal"] .is-active')
    expect(active.exists()).toBe(true)
    expect(active.attributes('aria-current')).toBe('page')
    expect(active.text()).toContain('Inventario')
  })

  it('pinta los breadcrumbs que fija la pantalla', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/plants/1' })
    // Los fija la pantalla ya montada, que es cuando conoce el nombre de la planta (ADR-013).
    useBreadcrumbs().set([{ label: 'Inventario', to: '/plants' }, { label: 'Bola verde' }])
    await wrapper.vm.$nextTick()

    const crumbs = wrapper.find('nav[aria-label="Ruta de navegación"]')
    expect(crumbs.text()).toContain('Inventario')
    expect(crumbs.text()).toContain('Bola verde')

    useBreadcrumbs().clear()
  })

  it('la navegación se pliega y se despliega con controles con nombre accesible', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    const sidebar = wrapper.find('[data-role="sidebar"]')
    expect(sidebar.attributes('data-open')).toBe('false')

    await wrapper.find('[aria-label="Abrir navegación"]').trigger('click')
    expect(wrapper.find('[data-role="sidebar"]').attributes('data-open')).toBe('true')

    await wrapper.find('[aria-label="Cerrar navegación"]').trigger('click')
    expect(wrapper.find('[data-role="sidebar"]').attributes('data-open')).toBe('false')
  })

  it('monta el contenedor de confirmaciones una sola vez', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    expect(wrapper.findAll('[role="status"][aria-live="polite"]')).toHaveLength(1)
  })

  it('la galería del kit no figura en la navegación de producto', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    const nav = wrapper.find('nav[aria-label="Navegación principal"]')
    expect(nav.text().toLowerCase()).not.toContain('ui kit')
    expect(nav.findAll('a[href="/ui-kit"]')).toHaveLength(0)
  })
})

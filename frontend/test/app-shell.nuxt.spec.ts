import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DefaultLayout from '../app/layouts/default.vue'
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { sectionAddresses } from '@features/layout/navigation'
import { searchApiService } from '@features/search/services/search.api.service'
import { ok } from '@shared/types/api.types'

/**
 * Escenarios de la requirement "Armazón de la aplicación" (`design-system`) y de "Orientación
 * permanente en toda pantalla" (`plant-dashboard`).
 */
describe('armazón de la aplicación', () => {
  it('marca la sección activa con algo más que el color y la expone como actual', async () => {
    // Una ficha de detalle sigue perteneciendo a su sección: la marca no es coincidencia exacta.
    const wrapper = await mountSuspended(DefaultLayout, { route: '/plants/1' })

    const active = wrapper.find('nav[aria-label="Navegación principal"] .is-active')
    expect(active.exists()).toBe(true)
    expect(active.attributes('aria-current')).toBe('page')
    expect(active.text()).toContain('Plantas')
  })

  it('reparte las entradas en las cuatro agrupaciones, cuyos encabezados no navegan', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    const nav = wrapper.find('nav[aria-label="Navegación principal"]')
    const labels = nav.findAll('[data-test="group-label"]').map((node) => node.text())
    expect(labels).toEqual(['Colección', 'Trabajo diario', 'Catálogos', 'Administración'])

    for (const label of nav.findAll('[data-test="group-label"]')) {
      expect(label.element.tagName).not.toBe('A')
      expect(label.find('a').exists()).toBe(false)
    }
  })

  it('el Dashboard abre la navegación, fuera de toda agrupación, y solo se marca en la raíz', async () => {
    const home = await mountSuspended(DefaultLayout, { route: '/' })
    const nav = home.find('nav[aria-label="Navegación principal"]')
    expect(nav.findAll('a')[0]!.text()).toContain('Dashboard')
    expect(nav.find('.is-active').text()).toContain('Dashboard')

    const elsewhere = await mountSuspended(DefaultLayout, { route: '/tasks' })
    const active = elsewhere.findAll('nav[aria-label="Navegación principal"] .is-active')
    expect(active.map((link) => link.text())).toEqual([expect.stringContaining('Tareas')])
  })

  it('alcanza todas las secciones declaradas desde la navegación', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    const hrefs = wrapper
      .find('nav[aria-label="Navegación principal"]')
      .findAll('a')
      .map((link) => link.attributes('href'))
    expect(hrefs).toEqual(sectionAddresses())
  })

  it('la barra superior aloja la búsqueda global junto a los breadcrumbs', async () => {
    const wrapper = await mountSuspended(DefaultLayout)

    const topbar = wrapper.find('header')
    expect(topbar.find('input[role="combobox"]').exists()).toBe(true)
  })

  it('navega al elegir un resultado de la búsqueda', async () => {
    // La búsqueda va al API tras una pausa: se sirve un resultado y se espera a que llegue.
    vi.spyOn(searchApiService, 'search').mockResolvedValue(ok([{
      kind: 'plant',
      label: 'Plantas',
      results: [{ kind: 'plant', label: 'CAT-GRUSS-01', detail: 'Bola verde', to: '/plants/1' }],
    }]))
    const wrapper = await mountSuspended(DefaultLayout)
    const router = useRouter()
    const pushed: string[] = []
    const push = router.push
    router.push = (async (to: unknown) => { pushed.push(String(to)) }) as typeof router.push

    try {
      const input = wrapper.find('input[role="combobox"]')
      await input.setValue('gruss')
      await new Promise((resolve) => setTimeout(resolve, 400))
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'Enter' })

      expect(pushed).toEqual(['/plants/1'])
    } finally {
      router.push = push
      vi.restoreAllMocks()
    }
  })

  it('«Ver los N resultados» abre el inventario ya filtrado y cierra la búsqueda', async () => {
    vi.spyOn(searchApiService, 'search').mockResolvedValue(ok([{
      kind: 'plant',
      label: 'Plantas',
      results: [{ kind: 'plant', label: 'CAT-GRUSS-01', detail: 'Bola verde', to: '/plants/1' }],
      more: { label: 'Ver los 37 resultados', to: '/plants?q=gruss' },
    }]))
    const wrapper = await mountSuspended(DefaultLayout)
    const router = useRouter()
    const pushed: string[] = []
    const push = router.push
    router.push = (async (to: unknown) => { pushed.push(String(to)) }) as typeof router.push

    try {
      const input = wrapper.find('input[role="combobox"]')
      await input.setValue('gruss')
      await new Promise((resolve) => setTimeout(resolve, 400))
      // El enlace es la segunda opción del recorrido: tras la planta.
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'Enter' })

      expect(pushed).toEqual(['/plants?q=gruss'])
      // Elegirlo cierra la búsqueda y vacía la caja.
      expect((input.element as HTMLInputElement).value).toBe('')
    } finally {
      router.push = push
      vi.restoreAllMocks()
    }
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

  it('limpia los breadcrumbs anteriores antes de montar la pantalla siguiente', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/tasks' })
    const router = useRouter()

    useBreadcrumbs().set([{ label: 'Tareas' }])
    await wrapper.vm.$nextTick()
    expect(wrapper.find('nav[aria-label="Ruta de navegación"]').text()).toContain('Tareas')

    await router.push('/alerts')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('nav[aria-label="Ruta de navegación"]').exists()).toBe(false)
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

import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiNavGroup from '../app/components/ui/UiNavGroup.vue'

/**
 * Escenarios "Entradas agrupadas" y "Un encabezado de agrupación no navega" de la requirement
 * "Mapa de secciones" (`app-navigation`), y "Entradas agrupadas" del "Armazón de la aplicación"
 * (`design-system`).
 */

const ENTRIES = [
  { label: 'Plantas', to: '/plants', mark: '▤' },
  { label: 'Localizaciones', to: '/locations', mark: '⌂' },
]

describe('UiNavGroup', () => {
  it('presenta el encabezado del grupo y sus entradas', async () => {
    const wrapper = await mountSuspended(UiNavGroup, {
      props: { label: 'Colección', entries: ENTRIES },
    })

    expect(wrapper.text()).toContain('Colección')
    const links = wrapper.findAll('a')
    expect(links.map((link) => link.text())).toEqual(['▤ Plantas', '⌂ Localizaciones'])
  })

  it('el encabezado del grupo no es un destino: ni enlace ni botón', async () => {
    const wrapper = await mountSuspended(UiNavGroup, {
      props: { label: 'Colección', entries: ENTRIES },
    })

    const heading = wrapper.find('[data-test="group-label"]')
    expect(heading.exists()).toBe(true)
    expect(heading.element.tagName).not.toBe('A')
    expect(heading.element.tagName).not.toBe('BUTTON')
    expect(heading.find('a').exists()).toBe(false)
  })

  it('marca la entrada activa como la actual, y solo esa', async () => {
    const wrapper = await mountSuspended(UiNavGroup, {
      props: { label: 'Colección', entries: ENTRIES, activePath: '/plants/882687672222443468' },
    })

    const current = wrapper.findAll('a').filter((link) => link.attributes('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]!.text()).toContain('Plantas')
    // La distinción no depende del color: la clase la acompaña de peso y fondo propios.
    expect(current[0]!.classes()).toContain('is-active')
  })

  it('sin ruta activa no marca ninguna entrada', async () => {
    const wrapper = await mountSuspended(UiNavGroup, {
      props: { label: 'Colección', entries: ENTRIES, activePath: '/tasks' },
    })

    expect(wrapper.findAll('a[aria-current="page"]')).toHaveLength(0)
  })

  it('la marca tipográfica es decorativa y no la lee una tecnología de asistencia', async () => {
    const wrapper = await mountSuspended(UiNavGroup, {
      props: { label: 'Colección', entries: ENTRIES },
    })

    expect(wrapper.findAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(ENTRIES.length)
  })
})

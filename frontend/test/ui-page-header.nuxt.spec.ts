import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiPageHeader from '../app/components/ui/UiPageHeader.vue'

/**
 * Escenarios "Cabecera con título y acciones" y "Cabecera sin acciones" de la requirement
 * "Cabecera de página" (`design-system`).
 */
describe('UiPageHeader', () => {
  it('presenta el título como encabezado principal de la pantalla', async () => {
    const wrapper = await mountSuspended(UiPageHeader, { props: { title: 'Plantas' } })

    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBe('Plantas')
  })

  it('muestra el contexto y las acciones cuando se declaran', async () => {
    const wrapper = await mountSuspended(UiPageHeader, {
      props: { title: 'Plantas', context: '312 ejemplares' },
      slots: { actions: '<button type="button">Añadir planta</button>' },
    })

    expect(wrapper.text()).toContain('312 ejemplares')
    expect(wrapper.find('[data-test="page-actions"]').text()).toContain('Añadir planta')
  })

  it('sin acciones no deja ningún contenedor de acciones en el marcado', async () => {
    const wrapper = await mountSuspended(UiPageHeader, { props: { title: 'Plantas' } })

    expect(wrapper.find('[data-test="page-actions"]').exists()).toBe(false)
  })

  it('sin contexto no deja un párrafo vacío', async () => {
    const wrapper = await mountSuspended(UiPageHeader, { props: { title: 'Plantas' } })

    expect(wrapper.find('[data-test="page-context"]').exists()).toBe(false)
  })

  it('tiene un solo elemento raíz, para que los atributos del punto de uso caigan en él', async () => {
    const wrapper = await mountSuspended(UiPageHeader, {
      props: { title: 'Plantas' },
      attrs: { 'data-test': 'inventory-header' },
    })

    expect(wrapper.find('[data-test="inventory-header"]').exists()).toBe(true)
  })
})

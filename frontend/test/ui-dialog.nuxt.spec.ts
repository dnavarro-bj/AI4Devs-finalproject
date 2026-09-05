import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiDialog from '../app/components/ui/UiDialog.vue'

/** Escenarios "Diálogo abierto", "Cierre con teclado" y "Foco retenido". */
function open(slots: Record<string, string> = {}) {
  return mount(UiDialog, {
    props: { open: true, title: 'Análisis de CAT-GRUSS-01' },
    slots: { default: '<button data-test="first">Uno</button><button data-test="last">Dos</button>', ...slots },
    attachTo: document.body,
  })
}

describe('UiDialog', () => {
  it('cerrado no renderiza nada', () => {
    const wrapper = mount(UiDialog, { props: { open: false, title: 'Análisis' } })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('abierto expone título, contenido y acciones, y lleva el foco dentro', async () => {
    const wrapper = open({ footer: '<button data-test="accept">Cerrar y volver</button>' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('Análisis de CAT-GRUSS-01')
    expect(wrapper.text()).toContain('Cerrar y volver')
    expect(dialog.element.contains(document.activeElement)).toBe(true)

    wrapper.unmount()
  })

  it('la tecla de escape lo cierra', async () => {
    const wrapper = open()
    await new Promise((resolve) => setTimeout(resolve, 0))

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
  })

  it('el foco no sale del diálogo al tabular', async () => {
    const wrapper = open()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const last = wrapper.find('[data-test="last"]').element as HTMLElement
    last.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').element.contains(document.activeElement)).toBe(true)

    wrapper.unmount()
  })

  it('al cerrarse devuelve el foco a quien lo abrió', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const wrapper = mount(UiDialog, {
      props: { open: false, title: 'Análisis' },
      slots: { default: '<button>Uno</button>' },
      attachTo: document.body,
    })

    await wrapper.setProps({ open: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.setProps({ open: false })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.activeElement).toBe(opener)

    wrapper.unmount()
    opener.remove()
  })

  it('tiene un cierre explícito con nombre accesible', async () => {
    const wrapper = open()

    await wrapper.find('[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
  })
})

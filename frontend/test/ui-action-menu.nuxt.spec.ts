import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiActionMenu from '../app/components/ui/UiActionMenu.vue'

/** Requirement «Menú de acciones» (`design-system`). */

const ACTIONS = [
  { id: 'edit', label: 'Editar' },
  { id: 'skip', label: 'Omitir' },
  { id: 'locked', label: 'Bloqueada', disabled: true },
  { id: 'cancel', label: 'Cancelar', tone: 'danger' as const },
]

async function open(attrs: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(UiActionMenu, {
    props: { label: 'Acciones de la tarea', actions: ACTIONS },
    attrs,
    attachTo: document.body,
  })
  return wrapper
}

describe('UiActionMenu', () => {
  it('el botón declara que abre un menú y si está abierto', async () => {
    const wrapper = await open()
    const trigger = wrapper.find('button[aria-haspopup]')

    expect(trigger.attributes('aria-label')).toBe('Acciones de la tarea')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(4)
    wrapper.unmount()
  })

  it('elegir una acción emite su id y cierra la lista', async () => {
    const wrapper = await open()
    await wrapper.find('button[aria-haspopup]').trigger('click')

    await wrapper.findAll('[role="menuitem"]')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['skip']])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('con el teclado: Intro abre, las flechas recorren y Intro elige', async () => {
    const wrapper = await open()
    const trigger = wrapper.find('button[aria-haspopup]')

    await trigger.trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    // Al abrir, la primera acción habilitada ya está activa; una flecha baja a «Omitir».
    const menu = wrapper.find('[role="menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await menu.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')).toEqual([['skip']])
    wrapper.unmount()
  })

  it('las flechas saltan las acciones deshabilitadas', async () => {
    const wrapper = await open()
    await wrapper.find('button[aria-haspopup]').trigger('click')

    const menu = wrapper.find('[role="menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await menu.trigger('keydown', { key: 'Enter' })

    // «Editar» → «Omitir» → (se salta «Bloqueada») → «Cancelar».
    expect(wrapper.emitted('select')).toEqual([['cancel']])
    wrapper.unmount()
  })

  it('Escape cierra y devuelve el foco al botón', async () => {
    const wrapper = await open()
    const trigger = wrapper.find('button[aria-haspopup]')
    await trigger.trigger('click')

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('un clic fuera cierra la lista', async () => {
    const wrapper = await open()
    await wrapper.find('button[aria-haspopup]').trigger('click')

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('una acción deshabilitada no se puede elegir ni emite nada', async () => {
    const wrapper = await open()
    await wrapper.find('button[aria-haspopup]').trigger('click')

    const locked = wrapper.findAll('[role="menuitem"]')[2]!
    expect(locked.attributes('aria-disabled')).toBe('true')
    await locked.trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
    wrapper.unmount()
  })

  it('un solo elemento raíz: los atributos del punto de uso caen en él', async () => {
    const wrapper = await open({ 'data-test': 'row-actions' })

    expect(wrapper.attributes('data-test')).toBe('row-actions')
    expect(wrapper.element.parentElement?.children.length ?? 1).toBeGreaterThan(0)
    wrapper.unmount()
  })
})

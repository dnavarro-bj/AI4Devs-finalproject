import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import SavedViewMenu from '../src/features/views/components/SavedViewMenu.vue'
import type { SavedView } from '../src/features/views/types/view.types'

/** El selector de vistas del inventario y de grupos de especies. */
describe('selector de vistas guardadas', () => {
  const view = (id: string, name: string, over: Partial<SavedView> = {}): SavedView => ({
    id, scope: 'plants', name, query: 'status=cuarentena', createdAt: '', updatedAt: '', ...over,
  })

  const VIEWS = [view('1', 'Cuarentena'), view('2', 'Zonas')]

  const ok = () => vi.fn().mockResolvedValue(null)

  const mount = async (props: Record<string, unknown> = {}) => {
    const wrapper = await mountSuspended(SavedViewMenu, {
      props: {
        views: VIEWS, saveAs: ok(), replaceWith: ok(), renameTo: ok(), removeView: ok(), ...props,
      },
    })
    await wrapper.find('[data-test="views-toggle"]').trigger('click')
    return wrapper
  }

  it('está cerrado hasta que se abre', async () => {
    const wrapper = await mountSuspended(SavedViewMenu, {
      props: { views: VIEWS, saveAs: ok(), replaceWith: ok(), renameTo: ok(), removeView: ok() },
    })

    expect(wrapper.find('[data-test="views-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="views-toggle"]').attributes('aria-expanded')).toBe('false')
  })

  it('lista las vistas y marca la aplicada', async () => {
    const wrapper = await mount({ appliedId: '2' })

    const pressed = wrapper.findAll('[data-test="view-apply"]').map((button) => button.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'true'])
    expect(wrapper.text()).toContain('Cuarentena')
    expect(wrapper.text()).toContain('Zonas')
  })

  it('aplicar emite la vista y cierra el panel', async () => {
    const wrapper = await mount()

    await wrapper.findAll('[data-test="view-apply"]')[0]!.trigger('click')

    expect(wrapper.emitted('apply')?.[0]?.[0]).toMatchObject({ id: '1' })
    expect(wrapper.find('[data-test="views-panel"]').exists()).toBe(false)
  })

  it('sin vistas lo dice y ofrece guardar la actual', async () => {
    const wrapper = await mount({ views: [] })

    expect(wrapper.find('[data-test="views-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="view-save"]').text()).toContain('Guardar la vista actual')
  })

  it('con un grupo se llama «grupo» y muestra el recuento', async () => {
    const wrapper = await mount({
      kind: 'group',
      views: [view('1', 'Sensibles al frío', { scope: 'species', matchCount: 12 }), view('2', 'Una sola', { scope: 'species', matchCount: 1 })],
    })

    expect(wrapper.find('[data-test="views-toggle"]').text()).toContain('Grupos')
    expect(wrapper.find('[data-test="view-save"]').text()).toContain('Guardar los filtros como grupo')
    expect(wrapper.text()).toContain('12 especies')
    expect(wrapper.text()).toContain('1 especie')
  })

  it('guarda con el nombre elegido y se cierra el diálogo', async () => {
    const saveAs = ok()
    const wrapper = await mount({ saveAs })

    await wrapper.find('[data-test="view-save"]').trigger('click')
    await wrapper.find('[data-test="view-name"]').setValue('Mi vista')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(saveAs).toHaveBeenCalledWith('Mi vista')
    expect(wrapper.find('[data-test="name-form"]').exists()).toBe(false)
  })

  it('un nombre repetido se queda en el diálogo con su error y lo escrito', async () => {
    const saveAs = vi.fn().mockResolvedValue('Ya existe')
    const wrapper = await mount({ saveAs })

    await wrapper.find('[data-test="view-save"]').trigger('click')
    await wrapper.find('[data-test="view-name"]').setValue('Cuarentena')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="name-error"]').text()).toContain('Ya existe')
    expect((wrapper.find('[data-test="view-name"]').element as HTMLInputElement).value).toBe('Cuarentena')
  })

  it('renombrar parte del nombre actual y envía vista y nombre nuevo', async () => {
    const renameTo = ok()
    const wrapper = await mount({ renameTo })

    await wrapper.findAll('[data-test="view-rename"]')[0]!.trigger('click')
    expect((wrapper.find('[data-test="view-name"]').element as HTMLInputElement).value).toBe('Cuarentena')
    await wrapper.find('[data-test="view-name"]').setValue('Cuarentena norte')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(renameTo).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }), 'Cuarentena norte')
  })

  it('reemplazar con el estado actual llama a la acción de esa vista', async () => {
    const replaceWith = ok()
    const wrapper = await mount({ replaceWith })

    await wrapper.findAll('[data-test="view-replace"]')[1]!.trigger('click')

    expect(replaceWith).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }))
  })

  it('un fallo al reemplazar se ve en línea', async () => {
    const wrapper = await mount({ replaceWith: vi.fn().mockResolvedValue('No se pudo') })

    await wrapper.findAll('[data-test="view-replace"]')[0]!.trigger('click')
    await settle()

    expect(wrapper.find('[data-test="views-action-error"]').text()).toContain('No se pudo')
  })

  it('con una vista modificada ofrece reemplazarla con este estado', async () => {
    const replaceWith = ok()
    const wrapper = await mount({ modified: VIEWS[0], replaceWith })

    expect(wrapper.find('[data-test="views-modified"]').text()).toContain('Cuarentena')
    await wrapper.find('[data-test="replace-modified"]').trigger('click')

    expect(replaceWith).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
  })

  it('borrar pide confirmación y no borra al cancelar', async () => {
    const removeView = ok()
    const wrapper = await mount({ removeView })

    await wrapper.findAll('[data-test="view-remove"]')[0]!.trigger('click')
    expect(wrapper.find('[data-test="remove-confirm"]').exists()).toBe(true)
    await wrapper.find('[data-test="cancel-remove"]').trigger('click')

    expect(removeView).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="remove-confirm"]').exists()).toBe(false)
  })

  it('borrar confirmado llama a la acción y cierra la confirmación', async () => {
    const removeView = ok()
    const wrapper = await mount({ removeView })

    await wrapper.findAll('[data-test="view-remove"]')[1]!.trigger('click')
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(removeView).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }))
    expect(wrapper.find('[data-test="remove-confirm"]').exists()).toBe(false)
  })

  it('un fallo al borrar se muestra en la confirmación, que sigue abierta', async () => {
    const wrapper = await mount({ removeView: vi.fn().mockResolvedValue('Caído') })

    await wrapper.findAll('[data-test="view-remove"]')[0]!.trigger('click')
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="remove-error"]').text()).toContain('Caído')
    expect(wrapper.find('[data-test="remove-confirm"]').exists()).toBe(true)
  })

  it('si el API de vistas falla, el selector lo dice en línea y sigue siendo usable', async () => {
    const wrapper = await mount({ views: [], error: 'Caído' })

    expect(wrapper.find('[data-test="views-error"]').text()).toContain('Caído')
    expect(wrapper.find('[data-test="views-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="view-save"]').exists()).toBe(true)
  })

  it('mientras carga lo indica', async () => {
    const wrapper = await mount({ views: [], loading: true })

    expect(wrapper.find('[data-test="views-loading"]').exists()).toBe(true)
  })
})

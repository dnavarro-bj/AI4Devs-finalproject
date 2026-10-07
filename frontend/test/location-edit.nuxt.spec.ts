import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { detail, nursery, page } from './helpers/locationFixtures'
import LocationEdit from '../app/pages/locations/[id]/edit.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300001' }, query: {} }))

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('navigateTo', () => navigate)

/** Escenarios de «Administración de una localización»: la edición completa y el selector de padre. */
describe('edición de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    navigate.mockReset()
  })

  /** Se edita Invernadero 1, que contiene a Bancada norte y a sus dos bandejas. */
  const greenhouse = () => detail({
    id: '300001', name: 'Invernadero 1', code: 'LOC-I1', parentId: null, ancestors: [], locationType: 'invernadero',
    capacity: 400, environment: 'cubierto', sunExposure: 'soleado', plantCount: 0, plantCountTotal: 62,
  })

  function serve(location = greenhouse()) {
    api.get.mockImplementation(async (path: string) => (path === '/locations/300001' ? location : page(nursery())))
  }

  async function open() {
    const wrapper = await mountSuspended(LocationEdit)
    await settle()
    return wrapper
  }

  const value = (wrapper: Awaited<ReturnType<typeof open>>, test: string) =>
    (wrapper.find(`[data-test="${test}"]`).element as HTMLInputElement).value

  it('precarga todo lo guardado', async () => {
    serve()
    const wrapper = await open()

    expect(value(wrapper, 'name')).toBe('Invernadero 1')
    expect(value(wrapper, 'code')).toBe('LOC-I1')
    expect(value(wrapper, 'type')).toBe('invernadero')
    expect(value(wrapper, 'capacity')).toBe('400')
  })

  it('al corregir, el código guardado no se reescribe aunque cambie el nombre', async () => {
    serve()
    const wrapper = await open()

    await wrapper.find('[data-test="name"]').setValue('Invernadero principal')

    expect(value(wrapper, 'code')).toBe('LOC-I1')
  })

  it('guarda con un PUT de reemplazo completo y vuelve a la ficha', async () => {
    serve()
    api.put.mockResolvedValue(greenhouse())
    const wrapper = await open()

    await wrapper.find('[data-test="name"]').setValue('Invernadero principal')
    await wrapper.find('[data-test="location-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/locations/300001', {
      name: 'Invernadero principal',
      code: 'LOC-I1',
      description: 'Zona de semisombra para ejemplares jóvenes.',
      locationType: 'invernadero',
      capacity: 400,
      operationalNotes: 'Malla de sombreo fija.',
      environment: 'cubierto',
      sunExposure: 'soleado',
    })
    expect(navigate).toHaveBeenCalledWith('/locations/300001')
  })

  describe('el padre', () => {
    it('el selector no ofrece la propia localización ni sus descendientes', async () => {
      serve()
      const wrapper = await open()

      await wrapper.find('[data-test="change-parent"]').trigger('click')
      const options = wrapper.find('[data-test="parent-picker"]').findAll('[role="option"]').map((option) => option.text())

      expect(options.some((text) => text.includes('Cuarentena')), 'una raíz ajena sí se puede elegir').toBe(true)
      for (const forbidden of ['Invernadero 1', 'Bancada norte', 'Bandeja A3', 'Bandeja A4']) {
        expect(options.some((text) => text.includes(`${forbidden}`) && !text.includes('/')), `${forbidden} no debería ofrecerse`).toBe(false)
      }
      expect(options).toHaveLength(1)
    })

    it('mover bajo otra localización envía el padre nuevo', async () => {
      serve()
      api.put.mockResolvedValue(greenhouse())
      const wrapper = await open()

      await wrapper.find('[data-test="change-parent"]').trigger('click')
      await wrapper.find('[data-test="parent-picker"]').findAll('[role="option"]')[0]!.trigger('click')
      await wrapper.find('[data-test="location-form"]').trigger('submit')
      await settle()

      expect(api.put).toHaveBeenCalledWith('/locations/300001', expect.objectContaining({ parentId: '300005' }))
    })

    it('pasar a raíz omite el padre', async () => {
      serve(detail({ ...greenhouse(), parentId: '300005', ancestors: [{ id: '300005', name: 'Cuarentena' }] }))
      api.put.mockResolvedValue(greenhouse())
      const wrapper = await open()

      await wrapper.find('[data-test="change-parent"]').trigger('click')
      await wrapper.find('[data-test="pick-root"]').trigger('click')
      await wrapper.find('[data-test="location-form"]').trigger('submit')
      await settle()

      expect(api.put.mock.calls[0]![1]).not.toHaveProperty('parentId')
    })

    it('un ciclo que el servidor rechaza se dice junto al padre, sin perder lo escrito', async () => {
      serve()
      api.put.mockRejectedValue(new ApiError(409, 'Una localización no puede ser hija de sí misma ni de sus descendientes'))
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Otro nombre')
      await wrapper.find('[data-test="location-form"]').trigger('submit')
      await settle()

      expect(wrapper.find('[data-test="parent-error"]').text()).toContain('descendientes')
      expect(value(wrapper, 'name')).toBe('Otro nombre')
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  it('un código ya usado se dice junto al campo', async () => {
    serve()
    api.put.mockRejectedValue(new ApiError(409, "El código 'LOC-CUA' ya lo usa otra localización"))
    const wrapper = await open()

    await wrapper.find('[data-test="code"]').setValue('LOC-CUA')
    await wrapper.find('[data-test="location-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="code-error"]').text()).toContain('LOC-CUA')
  })

  it('una localización inexistente lo explica y ofrece volver al catálogo', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La localización '300001' no existe"))
    const wrapper = await open()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })
})

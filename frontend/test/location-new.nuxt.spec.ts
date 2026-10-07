import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { nursery, page, detail } from './helpers/locationFixtures'
import LocationNew from '../app/pages/locations/new.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

const { navigate, route } = vi.hoisted(() => ({
  navigate: vi.fn(),
  route: { params: {}, query: {} as Record<string, string> },
}))
mockNuxtImport('navigateTo', () => navigate)
mockNuxtImport('useRoute', () => () => route)

/** Escenarios de la requirement «Administración de una localización»: el alta con jerarquía. */
describe('alta de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    navigate.mockReset()
    route.query = {}
    api.get.mockImplementation(async () => page(nursery()))
  })

  async function open() {
    const wrapper = await mountSuspended(LocationNew)
    await settle()
    return wrapper
  }

  it('reproduce las tres secciones, la ayuda lateral y las acciones del editor', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="position-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="identity-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="characteristics-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="impact-note"]').exists()).toBe(true)
    expect(wrapper.find('.sticky-actions').exists()).toBe(true)
  })

  it('ya no hay nada marcado como pendiente de T-18: todos los campos son reales', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-mock="true"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('T-18')
    expect(wrapper.find('[data-test="type"]').attributes('disabled')).toBeUndefined()
  })

  it('crea con el contrato completo y abre la ficha resultante', async () => {
    api.post.mockResolvedValue(detail({ id: '300009' }))
    const wrapper = await open()

    await wrapper.find('[data-test="name"]').setValue('  Bancada este  ')
    await wrapper.find('[data-test="code"]').setValue('LOC-BE')
    await wrapper.find('[data-test="type"]').setValue('bancada')
    await wrapper.find('[data-test="capacity"]').setValue('120')
    await wrapper.find('[data-test="description"]').setValue('Junto a la entrada este')
    await wrapper.find('[data-test="notes"]').setValue('Acceso por el pasillo')
    await wrapper.find('[data-test="location-form"]').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/locations', {
      name: 'Bancada este',
      code: 'LOC-BE',
      description: 'Junto a la entrada este',
      locationType: 'bancada',
      capacity: 120,
      operationalNotes: 'Acceso por el pasillo',
    })
    expect(navigate).toHaveBeenCalledWith('/locations/300009')
  })

  it('sin padre se crea en la raíz del vivero y lo dice', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="impact-title"]').text()).toContain('raíz del vivero')
    expect(wrapper.find('[data-test="resulting-path"]').text()).toContain('Nueva localización')
  })

  describe('dentro de otra localización', () => {
    beforeEach(() => {
      route.query = { parent: '300002' }
    })

    it('«Añadir dentro» abre el alta con la posición ya elegida y la ruta resultante', async () => {
      const wrapper = await open()

      expect(wrapper.find('[data-test="parent-name"]').text()).toBe('Bancada norte')
      await wrapper.find('[data-test="name"]').setValue('Bandeja B1')
      expect(wrapper.find('[data-test="resulting-path"]').text()).toContain('Invernadero 1 / Bancada norte / Bandeja B1')
      expect(wrapper.find('[data-test="impact-title"]').text()).toContain('dentro de Bancada norte')
    })

    it('la localización se crea dentro: el cuerpo lleva el padre', async () => {
      api.post.mockResolvedValue(detail({ id: '300009' }))
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Bandeja B1')
      await wrapper.find('[data-test="location-form"]').trigger('submit')
      await settle()

      expect(api.post).toHaveBeenCalledWith('/locations', expect.objectContaining({ parentId: '300002', name: 'Bandeja B1' }))
    })
  })

  describe('el selector de padre', () => {
    it('«Cambiar padre» ofrece las localizaciones con su ruta y al elegir una actualiza la ruta resultante', async () => {
      const wrapper = await open()

      await wrapper.find('[data-test="change-parent"]').trigger('click')
      const picker = wrapper.find('[data-test="parent-picker"]')
      expect(picker.text()).toContain('Invernadero 1 / Bancada norte / Bandeja A3')

      const option = picker.findAll('[role="option"]').find((candidate) => candidate.text().includes('Cuarentena'))!
      await option.trigger('click')
      await wrapper.find('[data-test="name"]').setValue('Caja 1')

      expect(wrapper.find('[data-test="resulting-path"]').text()).toContain('Cuarentena / Caja 1')
      expect(wrapper.find('[data-test="parent-picker"]').exists(), 'elegir cierra el selector').toBe(false)
    })

    it('se puede volver a la raíz', async () => {
      route.query = { parent: '300002' }
      const wrapper = await open()

      await wrapper.find('[data-test="change-parent"]').trigger('click')
      await wrapper.find('[data-test="pick-root"]').trigger('click')

      expect(wrapper.find('[data-test="impact-title"]').text()).toContain('raíz del vivero')
    })
  })

  describe('el código se propone', () => {
    it('desde el nombre, y sigue al nombre mientras nadie lo toque', async () => {
      const wrapper = await open()
      const code = () => (wrapper.find('[data-test="code"]').element as HTMLInputElement).value

      await wrapper.find('[data-test="name"]').setValue('Invernadero 2')
      expect(code()).toBe('LOC-I2')

      await wrapper.find('[data-test="name"]').setValue('Invernadero 3')
      expect(code()).toBe('LOC-I3')
    })

    it('cuelga del código del padre', async () => {
      route.query = { parent: '300001' }
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Bancada sur')

      expect((wrapper.find('[data-test="code"]').element as HTMLInputElement).value).toBe('LOC-I1-BS')
    })

    it('un código escrito a mano no se pisa al cambiar el nombre', async () => {
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Bancada este')
      await wrapper.find('[data-test="code"]').setValue('MI-CODIGO')
      await wrapper.find('[data-test="name"]').setValue('Bancada oeste')

      expect((wrapper.find('[data-test="code"]').element as HTMLInputElement).value).toBe('MI-CODIGO')
    })
  })

  describe('validación y errores', () => {
    it('el nombre y el código son obligatorios antes de llamar al API', async () => {
      const wrapper = await open()

      await wrapper.find('[data-test="location-form"]').trigger('submit')

      expect(wrapper.find('[data-test="name-error"]').text()).toContain('nombre')
      expect(wrapper.find('[data-test="code-error"]').text()).toContain('código')
      expect(api.post).not.toHaveBeenCalled()
    })

    it('la capacidad ha de ser un entero positivo', async () => {
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Bancada este')
      await wrapper.find('[data-test="capacity"]').setValue('0')
      await wrapper.find('[data-test="location-form"]').trigger('submit')

      expect(wrapper.find('[data-test="capacity-error"]').exists()).toBe(true)
      expect(api.post).not.toHaveBeenCalled()
    })

    it('un código repetido se dice junto al campo, sin perder lo escrito', async () => {
      api.post.mockRejectedValue(new ApiError(409, "El código 'LOC-BE' ya lo usa otra localización"))
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Bancada este')
      await wrapper.find('[data-test="code"]').setValue('LOC-BE')
      await wrapper.find('[data-test="location-form"]').trigger('submit')
      await settle()

      expect(wrapper.find('[data-test="code-error"]').text()).toContain('LOC-BE')
      expect((wrapper.find('[data-test="name"]').element as HTMLInputElement).value).toBe('Bancada este')
    })

    it('un rechazo sin campo propio se dice arriba, sin perder el formulario', async () => {
      api.post.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))
      const wrapper = await open()

      await wrapper.find('[data-test="name"]').setValue('Bancada este')
      await wrapper.find('[data-test="code"]').setValue('LOC-BE')
      await wrapper.find('[data-test="location-form"]').trigger('submit')
      await settle()

      expect(wrapper.find('[data-test="submit-error"]').text()).toContain('No se ha podido')
      expect((wrapper.find('[data-test="name"]').element as HTMLInputElement).value).toBe('Bancada este')
    })
  })
})

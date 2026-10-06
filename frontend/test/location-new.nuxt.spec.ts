import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import LocationNew from '../app/pages/locations/new.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('navigateTo', () => navigate)

describe('alta de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    navigate.mockReset()
  })

  it('reproduce las tres secciones, la ayuda lateral y las acciones del editor', async () => {
    const wrapper = await mountSuspended(LocationNew)

    expect(wrapper.find('[data-test="position-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="identity-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="characteristics-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="impact-note"]').exists()).toBe(true)
    expect(wrapper.find('.sticky-actions').exists()).toBe(true)
  })

  it('mantiene visibles y marcados los campos que dependen de T-18', async () => {
    const wrapper = await mountSuspended(LocationNew)

    expect(wrapper.find('[data-test="position-section"] [data-mock="true"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="characteristics-section"] [data-mock="true"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('T-18')
  })

  it('crea con el contrato real y abre la ficha resultante', async () => {
    api.post.mockResolvedValue({ id: '300004', name: 'Bancada este' })
    const wrapper = await mountSuspended(LocationNew)

    await wrapper.find('[data-test="name"]').setValue('  Bancada este  ')
    await wrapper.find('[data-test="location-form"]').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/locations', { name: 'Bancada este' })
    expect(navigate).toHaveBeenCalledWith('/locations/300004')
  })

  it('explica un rechazo del API sin perder el formulario', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'name: el nombre es obligatorio'))
    const wrapper = await mountSuspended(LocationNew)

    await wrapper.find('[data-test="name"]').setValue('Bancada este')
    await wrapper.find('[data-test="location-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="submit-error"]').text()).toContain('obligatorio')
    expect((wrapper.find('[data-test="name"]').element as HTMLInputElement).value).toBe('Bancada este')
  })

  it('valida el único campo funcional antes de llamar al API', async () => {
    const wrapper = await mountSuspended(LocationNew)

    await wrapper.find('[data-test="location-form"]').trigger('submit')

    expect(wrapper.find('[data-test="name-error"]').text()).toContain('nombre')
    expect(api.post).not.toHaveBeenCalled()
  })
})

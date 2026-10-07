import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { useToast } from '@shared/composables/useToast'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantRow, serveLocation } from './helpers/locationFixtures'
import LocationDetail from '../app/pages/locations/[id]/index.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300002' }, query: {} }))

/** Escenarios de «Mover ejemplares desde la interfaz». */
describe('mover ejemplares desde la ficha de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    useToast().clear()
  })

  const plants = () => [plantRow('400001', 'Asiento de suegra'), plantRow('400002', 'Bola blanca'), plantRow('400003', 'Pinchitos')]

  async function open() {
    serveLocation(api, { plants: plants() })
    const wrapper = await mountSuspended(LocationDetail)
    await settle()
    return wrapper
  }

  async function select(wrapper: Awaited<ReturnType<typeof open>>, ...nicknames: string[]) {
    for (const nickname of nicknames) {
      await wrapper.find(`input[aria-label="Seleccionar ${nickname}"]`).setValue(true)
    }
  }

  async function openDialog(wrapper: Awaited<ReturnType<typeof open>>, ...nicknames: string[]) {
    await select(wrapper, ...nicknames)
    await wrapper.find('[data-test="move-selected"]').trigger('click')
    await settle()
  }

  async function chooseDestination(wrapper: Awaited<ReturnType<typeof open>>, name: string) {
    const option = wrapper.find('[data-test="move-dialog"]').findAll('[role="option"]').find((candidate) => candidate.find('strong').text() === name)!
    await option.trigger('click')
  }

  it('sin selección no hay acción de mover', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="move-selected"]').exists()).toBe(false)
  })

  it('con selección la acción dice cuántos ejemplares afecta', async () => {
    const wrapper = await open()

    await select(wrapper, 'Asiento de suegra', 'Bola blanca')

    expect(wrapper.find('[data-test="move-selected"]').text()).toContain('2 ejemplares')
  })

  it('el diálogo ofrece los destinos con su ruta, sin la propia localización de origen', async () => {
    const wrapper = await open()
    await openDialog(wrapper, 'Asiento de suegra')

    const options = wrapper.find('[data-test="move-dialog"]').findAll('[role="option"]')
    const codes = options.map((option) => option.find('code').text())

    expect(options).toHaveLength(4)
    expect(codes).not.toContain('LOC-I1-BN')
    expect(wrapper.find('[data-test="move-dialog"]').text()).toContain('Invernadero 1 / Bancada norte / Bandeja A3')
  })

  it('declara el alcance antes de confirmar y no mueve nada hasta entonces', async () => {
    const wrapper = await open()
    await openDialog(wrapper, 'Asiento de suegra', 'Bola blanca', 'Pinchitos')

    await chooseDestination(wrapper, 'Cuarentena')

    const scope = wrapper.find('[data-test="move-scope"]').text()
    expect(scope).toContain('3 ejemplares')
    expect(scope).toContain('Bancada norte')
    expect(scope).toContain('Cuarentena')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sin destino no se puede confirmar', async () => {
    const wrapper = await open()
    await openDialog(wrapper, 'Asiento de suegra')

    expect(wrapper.find('[data-test="confirm-move"]').attributes('disabled')).toBeDefined()
  })

  it('cancelar no mueve nada y conserva la selección', async () => {
    const wrapper = await open()
    await openDialog(wrapper, 'Asiento de suegra')
    await chooseDestination(wrapper, 'Cuarentena')

    await wrapper.find('[data-test="cancel-move"]').trigger('click')

    expect(api.post).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="move-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="move-selected"]').exists()).toBe(true)
  })

  it('confirmar mueve el lote al destino, lo dice y recarga la ficha', async () => {
    const wrapper = await open()
    api.post.mockResolvedValue({ moved: 2, unchanged: 0 })
    await openDialog(wrapper, 'Asiento de suegra', 'Bola blanca')
    await chooseDestination(wrapper, 'Cuarentena')
    api.get.mockClear()

    await wrapper.find('[data-test="confirm-move"]').trigger('click')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/locations/300005/movements', { plantIds: ['400001', '400002'] })
    expect(useToast().toasts.value.map((toast) => toast.message).join(' ')).toContain('2 ejemplares movidos')
    expect(api.get, 'la ficha se recarga para reflejar la carga nueva').toHaveBeenCalledWith('/locations/300002')
    expect(wrapper.find('[data-test="move-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="move-selected"]').exists(), 'la selección se vacía').toBe(false)
  })

  it('un solo ejemplar se cuenta en singular', async () => {
    const wrapper = await open()
    api.post.mockResolvedValue({ moved: 1, unchanged: 0 })
    await openDialog(wrapper, 'Pinchitos')
    await chooseDestination(wrapper, 'Cuarentena')

    expect(wrapper.find('[data-test="move-scope"]').text()).toContain('1 ejemplar ')
    await wrapper.find('[data-test="confirm-move"]').trigger('click')
    await settle()

    expect(useToast().toasts.value.map((toast) => toast.message).join(' ')).toContain('1 ejemplar movido')
  })

  it('los que ya estaban en el destino se cuentan aparte', async () => {
    const wrapper = await open()
    api.post.mockResolvedValue({ moved: 1, unchanged: 1 })
    await openDialog(wrapper, 'Asiento de suegra', 'Bola blanca')
    await chooseDestination(wrapper, 'Bandeja A3')

    await wrapper.find('[data-test="confirm-move"]').trigger('click')
    await settle()

    const message = useToast().toasts.value.map((toast) => toast.message).join(' ')
    expect(message).toContain('1 ejemplar movido')
    expect(message).toContain('1 ya estaba allí')
  })

  it('si el API rechaza el lote no se da por hecho: el diálogo sigue abierto y la selección intacta', async () => {
    const wrapper = await open()
    api.post.mockRejectedValue(new ApiError(400, "La planta '400002' no existe"))
    await openDialog(wrapper, 'Asiento de suegra', 'Bola blanca')
    await chooseDestination(wrapper, 'Cuarentena')

    await wrapper.find('[data-test="confirm-move"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="move-error"]').text()).toContain('400002')
    expect(wrapper.find('[data-test="move-dialog"]').exists()).toBe(true)
    expect(useToast().toasts.value).toHaveLength(0)
    await wrapper.find('[data-test="cancel-move"]').trigger('click')
    expect(wrapper.find('[data-test="move-selected"]').text()).toContain('2 ejemplares')
  })

  it('un catálogo que no carga lo dice en el diálogo, sin dejarlo en blanco', async () => {
    const wrapper = await open()
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation(async (path: string, params: unknown) => {
      if (path === '/locations') throw new ApiError(500, 'No se ha podido completar la operación.')
      return base(path, params)
    })

    await openDialog(wrapper, 'Asiento de suegra')

    expect(wrapper.find('[data-test="move-load-error"]').exists()).toBe(true)
  })
})

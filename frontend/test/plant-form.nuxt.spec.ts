import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { usePendingUploads } from '@features/media/composables/usePendingUploads'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail, speciesCare } from './helpers/fixtures'
import NewPlantPage from '../app/pages/plants/new.vue'
import PlantForm from '@features/plants/components/PlantForm.vue'

const api = createApiDouble()
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('navigateTo', () => navigate)

const page = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })

/** Escenarios de «Fotografías iniciales en el alta del ejemplar» (T-19). */
describe('fotografías iniciales del alta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.postForm.mockReset()
    navigate.mockReset()
    clearNuxtState()
    usePendingUploads().discardAll()
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') return page([{ id: '300001', name: 'Invernadero 1' }])
      if (path === '/soil-mixes') return page([])
      if (path === '/species') return page([{ id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }])
      if (path === '/species/200001') return speciesCare()
      throw new Error(`ruta inesperada: ${path}`)
    })
    api.post.mockResolvedValue(plantDetail())
  })

  const FILE = (name: string, type = 'image/jpeg') => new File(['x'], name, { type })

  const open = async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()
    await wrapper.find('[data-test="nickname"]').setValue('Bola verde')
    await wrapper.find('[data-test="location"]').setValue('300001')
    await wrapper.find('[data-test="species-200001"]').trigger('click')
    await settle()
    return wrapper
  }

  const choose = async (wrapper: Awaited<ReturnType<typeof open>>, files: File[]) => {
    wrapper.findComponent({ name: 'UiUploadArea' }).vm.$emit('files', files)
    await settle()
  }

  const submit = async (wrapper: Awaited<ReturnType<typeof open>>, which: 'save-primary' | 'save-another' = 'save-primary') => {
    await wrapper.find(`[data-test="${which}"]`).trigger('click')
    await wrapper.find('form').trigger('submit')
    await settle()
    await settle()
  }

  it('la sección se llama «Fotografías iniciales», con el copy corregido y sin T-19', async () => {
    const wrapper = await open()

    const section = wrapper.find('#plant-editor-photos')
    expect(section.text()).toContain('Fotografías iniciales')
    expect(section.text()).toContain('será la portada de su ficha')
    expect(section.text()).not.toContain('identificará la planta en el inventario')
    expect(section.text()).not.toContain('T-19')
    expect(section.find('[data-mock]').exists()).toBe(false)
  })

  it('ofrece las tres sugerencias, que fijan el propósito', async () => {
    const wrapper = await open()

    const suggestions = wrapper.find('[data-test="photo-purpose"]')
    expect(suggestions.text()).toContain('Una foto general')
    expect(suggestions.text()).toContain('Un detalle reconocible')
    expect(suggestions.text()).toContain('La etiqueta física, si existe')
  })

  it('el alta sin fotografías no sube nada y no se bloquea', async () => {
    const wrapper = await open()

    await submit(wrapper)

    expect(api.postForm).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')
  })

  it('el alta con fotografías las sube después de crear, cada una con su propósito, y abre la ficha', async () => {
    api.postForm.mockResolvedValue([])
    const wrapper = await open()

    await wrapper.find('[data-test="purpose-general"]').setValue(true)
    await choose(wrapper, [FILE('general.jpg')])
    await wrapper.find('[data-test="purpose-detalle"]').setValue(true)
    await choose(wrapper, [FILE('apice.jpg')])
    await submit(wrapper)

    const sent = api.postForm.mock.calls.map(([path, form]) => {
      const data = form as FormData
      return [path, (data.get('files') as File).name, data.get('purpose')]
    })
    expect(sent).toEqual([
      ['/plants/882687672222443468/photos', 'general.jpg', 'general'],
      ['/plants/882687672222443468/photos', 'apice.jpg', 'detalle'],
    ])
    expect(api.post.mock.invocationCallOrder[0]).toBeLessThan(api.postForm.mock.invocationCallOrder[0]!)
    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')
  })

  it('el propósito elegido al añadir es el de esas fotos, no el de las siguientes', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="purpose-etiqueta_fisica"]').setValue(true)
    await choose(wrapper, [FILE('etiqueta.jpg')])
    await wrapper.find('[data-test="purpose-general"]').setValue(true)
    await choose(wrapper, [FILE('otra.jpg')])

    const captions = wrapper.findAll('[data-test="photo-previews"] [data-role="thumb"] img').map((img) => img.attributes('alt'))
    expect(captions).toEqual(['etiqueta.jpg', 'otra.jpg'])
  })

  it('una subida fallida no impide el alta: se llega a la ficha y lo no subido queda en la cola', async () => {
    api.postForm.mockRejectedValue(new ApiError(500, 'Error del servidor'))
    const wrapper = await open()
    await choose(wrapper, [FILE('a.jpg')])

    await submit(wrapper)

    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')
    const pending = usePendingUploads().pendingFor({ kind: 'plants', id: '882687672222443468' })
    expect(pending.value).toMatchObject([{ name: 'a.jpg', message: 'Error del servidor' }])
  })

  it('un archivo que no es una imagen admitida se rechaza antes de enviar, con su motivo', async () => {
    const wrapper = await open()

    await choose(wrapper, [FILE('a.gif', 'image/gif')])

    expect(wrapper.find('[data-test="photo-rejected"]').text()).toContain('JPEG, PNG o WebP')
    await submit(wrapper)
    expect(api.postForm).not.toHaveBeenCalled()
  })

  it('«Guardar y añadir otra» sube las fotografías y vuelve al formulario vacío, sin arrastrarlas', async () => {
    api.postForm.mockResolvedValue([])
    const wrapper = await open()
    await choose(wrapper, [FILE('a.jpg')])

    await submit(wrapper, 'save-another')

    expect(api.postForm).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('[data-test="photo-previews"]').exists()).toBe(false)
  })

  it('«Guardar y añadir otra» es del alta: al editar no existe y las fotografías se gestionan en el acto', async () => {
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation(async (path: string, params?: unknown) => (path.endsWith('/photos') ? page([]) : base(path, params)))
    const mounted = await mountSuspended(PlantForm, { props: { lockedCode: 'CAT-GRUSS-01', plantId: '882687672222443468', initial: { nickname: 'Bola verde' } } })
    await settle()

    expect(mounted.find('[data-test="save-another"]').exists()).toBe(false)
    expect(mounted.find('#plant-editor-photos').text()).toContain('se guardan en el momento')
    expect(mounted.find('[data-test="photo-gallery"]').exists()).toBe(true)
    expect(api.get).toHaveBeenCalledWith('/plants/882687672222443468/photos', { page: 0, size: 50 })
  })
})

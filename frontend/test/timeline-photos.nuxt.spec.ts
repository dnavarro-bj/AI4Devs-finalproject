import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { usePendingUploads } from '@features/media/composables/usePendingUploads'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/** Escenarios de «Las fotografías de un evento en la cronología y en sus diálogos» (T-19). */

const PLANT = '882687672222443468'
interface Entry { id: string, type: string, occurredAt: string, [key: string]: unknown }

const photo = (id: string, extra: Record<string, unknown> = {}) => ({
  id, altText: `Foto ${id}`, width: 800, height: 600, capturedAt: null,
  urls: { thumb: `/media/${id}/thumb`, medium: `/media/${id}/medium`, full: `/media/${id}/full` },
  ...extra,
})
const comment = (id: string, photos?: ReturnType<typeof photo>[]): Entry =>
  ({ id, type: 'comentario', occurredAt: '2026-09-01T10:00:00Z', comment: { text: `Comentario ${id}` }, ...(photos ? { photos } : {}) })

const file = (name = 'a.jpg', type = 'image/jpeg') => new File(['x'], name, { type })

/** Un servidor con estado: lo que se sube o se descuelga cambia lo que devuelve la cronología. */
function serve(timeline: Entry[]) {
  const state = { timeline }
  api.get.mockImplementation((path: string) => {
    const envelope = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })
    if (path.endsWith('/timeline')) return Promise.resolve(envelope(state.timeline))
    if (path === '/tasks' || path.endsWith('/care-records') || path.endsWith('/status-changes') || path.endsWith('/movements') || path.endsWith('/photos')) {
      return Promise.resolve(envelope([]))
    }
    return Promise.resolve(plantDetail())
  })
  return state
}

const mountPage = async () => {
  const wrapper = await mountSuspended(PlantDetailPage)
  await settle()
  return wrapper
}

describe('fotografías en la cronología', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
    usePendingUploads().discardAll()
  })

  it('la tarjeta del evento pinta sus miniaturas, que se amplían con su texto alternativo', async () => {
    serve([comment('1', [photo('9', { altText: 'Espinación nueva en el ápice' })])])
    const wrapper = await mountPage()

    const thumb = wrapper.find('[data-test="event-photos-1"] img')
    expect(thumb.attributes('src')).toContain('/media/9/thumb')
    expect(thumb.attributes('alt')).toBe('Espinación nueva en el ápice')

    await wrapper.find('[data-test="event-photos-1"] [data-role="thumb"] button').trigger('click')
    expect(wrapper.find('[role="dialog"] img').attributes('alt')).toBe('Espinación nueva en el ápice')
    expect(wrapper.find('[role="dialog"] img').attributes('src')).toContain('/media/9/medium')
  })

  it('un evento sin fotografías no reserva hueco para ellas', async () => {
    serve([comment('1')])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="event-photos-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="entry-1"] .gallery').exists()).toBe(false)
  })

  it('las lecturas, los estados y los movimientos no ofrecen fotografía', async () => {
    serve([
      { id: '2', type: 'cambio_estado', occurredAt: '2026-09-02T10:00:00Z', statusChange: { from: 'activa', to: 'cuarentena' } },
      { id: '3', type: 'movimiento', occurredAt: '2026-09-03T10:00:00Z', movement: { from: { id: '1', name: 'A' }, to: { id: '2', name: 'B' } } },
    ])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="add-photo"]').exists()).toBe(false)
  })

  it('cada tarjeta fotografiable trae «Añadir fotografía» y el selector está accesible', async () => {
    serve([comment('1')])
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="entry-1"] [data-test="add-photo"]').text()).toBe('Añadir fotografía')
    expect(wrapper.find('[data-test="add-photo-input"]').attributes('aria-label')).toBeTruthy()
  })

  it('añadir una fotografía a un evento existente la sube con su eventId y la tarjeta la muestra sin recargar', async () => {
    const state = serve([comment('1')])
    api.postForm.mockImplementation(async () => {
      state.timeline = [comment('1', [photo('9')])]
      return [photo('9')]
    })
    const wrapper = await mountPage()

    const input = wrapper.find('[data-test="add-photo-input"]')
    Object.defineProperty(input.element, 'files', { value: [file()], configurable: true })
    await input.trigger('change')
    await settle()
    await settle()

    const [path, form] = api.postForm.mock.calls[0] as [string, FormData]
    expect(path).toBe(`/plants/${PLANT}/photos`)
    expect(form.get('eventId')).toBe('1')
    expect(wrapper.find('[data-test="event-photos-1"] img').attributes('src')).toContain('/media/9/thumb')
  })

  it('«Quitar» descuelga la fotografía del evento: la sigue teniendo el ejemplar', async () => {
    const state = serve([comment('1', [photo('9')])])
    api.put.mockImplementation(async () => {
      state.timeline = [comment('1')]
      return photo('9')
    })
    const wrapper = await mountPage()

    await wrapper.find('[data-test="event-photos-1"] .action-menu__trigger').trigger('click')
    const items = wrapper.findAll('[role="menuitem"]')
    expect(items.map((item) => item.text())).toEqual(['Quitar del evento'])
    await items[0]!.trigger('click')
    await settle()

    expect(api.put).toHaveBeenCalledWith(`/plants/${PLANT}/photos/9`, { eventId: null })
    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="event-photos-1"]').exists()).toBe(false)
  })

  it('una subida fallida avisa en la tarjeta con su reintento', async () => {
    serve([comment('1')])
    api.postForm.mockRejectedValue(new ApiError(500, 'Error del servidor'))
    const wrapper = await mountPage()

    const input = wrapper.find('[data-test="add-photo-input"]')
    Object.defineProperty(input.element, 'files', { value: [file('a.jpg')], configurable: true })
    await input.trigger('change')
    await settle()
    await settle()

    expect(wrapper.find('[data-test="event-pending-1"]').text()).toContain('1 fotografía sin subir')
    api.postForm.mockResolvedValue([photo('9')])
    await wrapper.find('[data-test="retry-event-photos"]').trigger('click')
    await settle()
    expect(wrapper.find('[data-test="event-pending-1"]').exists()).toBe(false)
  })
})

describe('adjuntar fotografías en los diálogos de la cronología', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
    usePendingUploads().discardAll()
  })

  const openComment = async (wrapper: Awaited<ReturnType<typeof mountPage>>) => {
    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-comment"]').trigger('click')
  }
  const attach = async (wrapper: Awaited<ReturnType<typeof mountPage>>, files: File[]) => {
    wrapper.findComponent({ name: 'TimelineCommentDialog' }).findComponent({ name: 'UiUploadArea' }).vm.$emit('files', files)
    await settle()
  }

  it('crea el comentario y después sube las fotografías con su eventId; la tarjeta las muestra', async () => {
    const state = serve([])
    api.post.mockImplementation(async () => {
      state.timeline = [comment('7', [photo('9')])]
      return comment('7')
    })
    api.postForm.mockResolvedValue([photo('9')])
    const wrapper = await mountPage()

    await openComment(wrapper)
    await wrapper.find('[data-test="comment-text"]').setValue('Nueva espinación')
    await attach(wrapper, [file()])
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()
    await settle()

    expect(api.post.mock.invocationCallOrder[0]).toBeLessThan(api.postForm.mock.invocationCallOrder[0]!)
    expect((api.postForm.mock.calls[0]![1] as FormData).get('eventId')).toBe('7')
    expect(wrapper.find('[data-test="comment-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="event-photos-7"] img').attributes('src')).toContain('/media/9/thumb')
  })

  it('un fallo de subida no deshace el evento ni bloquea el guardado: se cierra y avisa', async () => {
    const state = serve([])
    api.post.mockImplementation(async () => {
      state.timeline = [comment('7')]
      return comment('7')
    })
    api.postForm.mockRejectedValue(new ApiError(500, 'Error del servidor'))
    const wrapper = await mountPage()

    await openComment(wrapper)
    await wrapper.find('[data-test="comment-text"]').setValue('Nueva espinación')
    await attach(wrapper, [file()])
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()
    await settle()

    expect(wrapper.find('[data-test="comment-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="comment-body"]').text()).toBe('Comentario 7')
    expect(wrapper.find('[data-test="event-pending-7"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('1 fotografía no se subió')
  })

  it('sin fotografías el comentario sale como siempre', async () => {
    serve([])
    api.post.mockResolvedValue(comment('7'))
    const wrapper = await mountPage()

    await openComment(wrapper)
    await wrapper.find('[data-test="comment-text"]').setValue('Solo texto')
    await wrapper.find('[data-test="comment-form"]').trigger('submit')
    await settle()

    expect(api.postForm).not.toHaveBeenCalled()
  })

  it('las intervenciones y las floraciones también admiten adjuntar', async () => {
    serve([])
    const wrapper = await mountPage()

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-intervention"]').trigger('click')
    expect(wrapper.findComponent({ name: 'TimelineInterventionDialog' }).find('[data-test="event-photo-upload"]').exists()).toBe(true)
    await wrapper.find('[data-test="cancel-event"]').trigger('click')

    await wrapper.find('[data-test="add-event"]').trigger('click')
    await wrapper.find('[data-test="add-bloom-event"]').trigger('click')
    expect(wrapper.findComponent({ name: 'TimelineBloomDialog' }).find('[data-test="event-photo-upload"]').exists()).toBe(true)
  })

  it('un archivo que no es una imagen admitida se rechaza en el diálogo con su motivo', async () => {
    serve([])
    const wrapper = await mountPage()

    await openComment(wrapper)
    await attach(wrapper, [file('a.gif', 'image/gif')])

    expect(wrapper.find('[data-test="photo-rejected"]').text()).toContain('JPEG, PNG o WebP')
  })
})

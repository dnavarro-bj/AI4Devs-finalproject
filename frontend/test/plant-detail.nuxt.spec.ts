import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { careRecord, plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'
import { ApiError } from '@shared/services/httpClient'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/**
 * Escenarios "Ficha de una planta existente", "Ficha de una planta sin tags",
 * "Ficha de una planta inexistente" y "Rangos en la ficha antes de registrar la lectura".
 */
/**
 * La ficha pide **dos** cosas: la planta y su historial de lecturas, que `GET
 * /plants/{id}/care-records` sirve desde T-03 y hasta ahora nadie consumía. El doble tiene que
 * distinguirlas, porque un `mockResolvedValue` único devolvería una planta donde se espera un
 * envelope paginado. Los movimientos y los cambios de estado son otras dos páginas más.
 */
function serve(plant: unknown, records: unknown[] = [], statusChanges: unknown[] = [], movements: unknown[] = [], timeline: unknown[] = []) {
  const envelope = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })
  api.get.mockImplementation((path: string, params?: { type?: string[] }) => Promise.resolve(
    path === '/tasks'
      ? envelope([])
      : path.endsWith('/care-records')
      ? envelope(records)
      : path.endsWith('/status-changes') ? envelope(statusChanges)
        : path.endsWith('/movements') ? envelope(movements)
          // El servidor aplica el filtro de tipo; el doble lo imita.
          : path.endsWith('/timeline')
            ? envelope(timeline.filter((entry) => !params?.type?.length || params.type.includes((entry as { type: string }).type)))
            : plant,
  ))
}

/** Una entrada de lectura de la cronología, con la forma que sirve el API. */
const readingEntry = (record: ReturnType<typeof careRecord>) => ({
  id: record.id, type: 'lectura', occurredAt: record.recordedAt, reading: record,
})

describe('ficha de la planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
  })

  it('muestra nickname, localización, tags y los cuidados de su especie', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Bola verde')
    expect(text).toContain('Invernadero 1')
    expect(text).toContain('globular')
    expect(text).toContain('Echinocactus grusonii')
  })

  it('se pinta sin errores cuando la planta no tiene ningún tag', async () => {
    serve(plantDetail({ tags: [] }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bola verde')
    expect(wrapper.find('[data-test="tags"]').exists()).toBe(true)
  })

  /**
   * El API omite los valores no informados en lugar de mandarlos a `null`: llegan como
   * `undefined`, y la ficha no debe pintarlos como filas vacías.
   */
  it('muestra las cinco magnitudes de la lectura, marcando las no informadas', async () => {
    const registered = { id: '500001', plantId: '882687672222443468', recordedAt: '2026-09-02T09:00:00Z', humidity: 4 }
    serve(plantDetail())
    api.post.mockResolvedValue(registered)
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    // Tras registrar, la ficha recarga la cronología: el servidor ya la trae.
    serve(plantDetail(), [], [], [], [readingEntry(registered)])

    // El formulario vive ahora en un diálogo: hay que abrirlo.
    await wrapper.find('[data-test="register-reading"]').trigger('click')
    await wrapper.find('[data-test="humidity"]').setValue('4')
    await wrapper.find('[data-test="care-record-form"]').trigger('submit')
    await settle()

    // Y la lectura aparece en la cronología, con sus medidas en la rejilla comparable.
    const reading = wrapper.find('[data-test="reading-500001"]')
    expect(reading.text()).toContain('Humedad')
    expect(reading.text()).toContain('4 %')
    // Las cinco magnitudes aparecen, con las no informadas marcadas como ausentes y no como cero.
    expect(reading.findAll('[data-role="summary-item"]')).toHaveLength(5)
    expect(reading.findAll('[data-absent="true"]')).toHaveLength(4)
    expect(reading.find('[data-absent="true"]').text()).not.toContain('0')
  })

  it('explica que la planta no existe y ofrece volver al inventario', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La planta '999999999' no existe"))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('no existe')
    expect(wrapper.find('[data-test="back-to-inventory"]').attributes('href')).toBe('/plants')
  })

  /**
   * La requirement cambió con `esqueleto-plantas`: los rangos siguen a la vista sin ninguna acción
   * —ahora en el panel de cuidados efectivos—, pero el formulario **ya no ocupa la ficha**.
   */
  it('deja los rangos de la especie visibles sin ninguna acción, y el formulario recogido', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const ranges = wrapper.find('[data-test="effective-care"]')
    expect(ranges.exists()).toBe(true)
    const text = ranges.text()
    expect(text).toContain('10')
    expect(text).toContain('30')
    expect(text).toContain('cada 10-20 dias')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(false)
  })

  it('el formulario aparece al pedir registrar una lectura, y cerrar no registra nada', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await wrapper.find('[data-test="register-reading"]').trigger('click')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(true)

    await wrapper.find('[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('muestra las lecturas anteriores a la sesión, sin registrar ninguna', async () => {
    const records = [
      careRecord({ id: '600001', recordedAt: '2026-09-05T10:00:00Z', humidity: 31 }),
      careRecord({ id: '600002', recordedAt: '2026-09-01T10:00:00Z', temperature: 24 }),
    ]
    serve(plantDetail(), records, [], [], records.map(readingEntry))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="reading-600001"]').text()).toContain('31 %')
    expect(wrapper.find('[data-test="reading-600002"]').text()).toContain('24 °C')
  })

  it('una planta sin lecturas no muestra ninguna entrada de lectura', async () => {
    serve(plantDetail(), [])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.findAll('[data-test^="reading-"]')).toHaveLength(0)
  })

  it('cambia entre las secciones de la ficha sin salir de la planta', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual([
      'Resumen e historial', 'Fotografías', 'Floración', 'Datos',
    ])

    await tabs[1]!.trigger('click')
    expect(wrapper.find('[data-test="photos-view"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('T-19')
  })
})

/** Escenarios de «Fotografías del ejemplar en su ficha» (T-19). */
describe('ficha de la planta: fotografías', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.put.mockReset()
    api.post.mockReset()
    api.postForm.mockReset()
    api.delete.mockReset()
  })

  const photo = (id: string, extra: Record<string, unknown> = {}) => ({
    id, altText: `Foto ${id}`, width: 800, height: 600, contentType: 'image/jpeg',
    capturedAt: `2026-0${id}-10T00:00:00Z`, createdAt: '2026-09-01T10:00:00Z', position: Number(id) - 1,
    primary: id === '1', purpose: null, eventId: null,
    urls: { thumb: `/media/${id}/thumb`, medium: `/media/${id}/medium`, full: `/media/${id}/full` },
    ...extra,
  })

  /** La ficha normal más `GET /plants/{id}/photos`, que sirve lo que el test deje en `gallery`. */
  function servePhotos(initial: ReturnType<typeof photo>[], plant = plantDetail()) {
    const state = { gallery: initial }
    serve(plant)
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation((path: string, params?: Record<string, unknown>) => (
      path.endsWith('/photos')
        ? Promise.resolve({ content: state.gallery, totalElements: state.gallery.length, totalPages: 1, pageNumber: 0, pageSize: 50 })
        : base(path, params)
    ))
    return state
  }

  const photosTab = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => {
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
  }

  it('la cabecera muestra la portada real con su texto alternativo y «8 fotos»', async () => {
    servePhotos(Array.from({ length: 8 }, (_, i) => photo(String(i + 1))))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const cover = wrapper.find('[data-test="plant-cover"]')
    expect(cover.find('img').attributes('src')).toContain('/media/1/medium')
    expect(cover.find('img').attributes('alt')).toBe('Foto 1')
    expect(cover.text()).toContain('8 fotos')
    expect(wrapper.findAll('[role="tab"]')[1]!.text()).toContain('8')
  })

  it('sin fotografías la cabecera dice «Sin fotografía», sin cifras de ejemplo', async () => {
    servePhotos([])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="plant-cover"]').text()).toContain('Sin fotografía')
    expect(wrapper.text()).not.toContain('8 fotos')
    expect(wrapper.text()).not.toContain('T-19')
    await photosTab(wrapper)
    expect(wrapper.find('[data-test="photo-gallery"]').text()).toContain('Todavía no hay fotografías')
    expect(wrapper.find('[data-test="photo-upload"]').exists()).toBe(true)
  })

  it('la galería pide por defecto el orden de la evolución y muestra la fecha de captura al ampliar', async () => {
    servePhotos([photo('3'), photo('2'), photo('1')])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)

    const first = wrapper.find('[data-test="photo-gallery"] [data-role="thumb"] button')
    await first.trigger('click')

    expect(wrapper.find('[role="dialog"]').text()).toContain('Tomada el 10 de marzo de 2026')
    expect(wrapper.find('[role="dialog"]').text()).toContain('Subida el 1 de septiembre de 2026')
    const photoCalls = api.get.mock.calls.filter(([path]: [string]) => path.endsWith('/photos'))
    expect(photoCalls[0]![1]).toEqual({ page: 0, size: 50 })
  })

  it('«Manual» vuelve a pedir la galería con el orden manual y sin fecha obligada', async () => {
    servePhotos([photo('2'), photo('1')])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)

    await wrapper.find('[data-test="photo-sort"] input[value="manual"]').setValue(true)
    await settle()

    const photoCalls = api.get.mock.calls.filter(([path]: [string]) => path.endsWith('/photos'))
    expect(photoCalls.at(-1)![1]).toEqual({ page: 0, size: 50, sort: 'position' })
  })

  it('en el orden por fecha no se ofrece mover a mano; en «Manual» sí', async () => {
    servePhotos([photo('2'), photo('1')])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)

    await wrapper.find('[data-test="photo-gallery"] .action-menu__trigger').trigger('click')
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).not.toContain('Mover antes')

    await wrapper.find('[data-test="photo-sort"] input[value="manual"]').setValue(true)
    await settle()
    await wrapper.find('[data-test="photo-gallery"] .action-menu__trigger').trigger('click')
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toContain('Mover antes')
  })

  it('ampliar una foto colgada de un evento enlaza a él en la cronología', async () => {
    servePhotos([photo('1', { eventId: '77' })])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)

    await wrapper.find('[data-test="photo-gallery"] [data-role="thumb"] button').trigger('click')

    expect(wrapper.find('[role="dialog"] a').attributes('href')).toBe('/plants/882687672222443468?event=77')
  })

  it('subir desde la pestaña actualiza la galería, la portada y el recuento sin recargar', async () => {
    const state = servePhotos([])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)
    api.postForm.mockImplementation(async () => {
      state.gallery = [photo('1')]
      return [photo('1')]
    })

    wrapper.findComponent({ name: 'UiUploadArea' }).vm.$emit('files', [new File(['x'], 'a.jpg', { type: 'image/jpeg' })])
    await settle()
    await settle()

    expect(api.postForm.mock.calls[0]![0]).toBe('/plants/882687672222443468/photos')
    expect(wrapper.find('[data-test="plant-cover"]').text()).toContain('1 foto')
    expect(wrapper.find('[data-test="plant-cover"] img').attributes('src')).toContain('/media/1/medium')
    expect(wrapper.findAll('[role="tab"]')[1]!.text()).toContain('1')
  })

  it('el propósito de la subida viaja con los archivos', async () => {
    servePhotos([])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)
    api.postForm.mockResolvedValue([photo('1')])

    await wrapper.find('[data-test="upload-purpose"]').setValue('detalle')
    wrapper.findComponent({ name: 'UiUploadArea' }).vm.$emit('files', [new File(['x'], 'a.jpg', { type: 'image/jpeg' })])
    await settle()

    expect((api.postForm.mock.calls[0]![1] as FormData).get('purpose')).toBe('detalle')
  })

  it('corregir la fecha de captura envía la fecha y recarga la galería', async () => {
    const state = servePhotos([photo('1')])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await photosTab(wrapper)
    api.put.mockImplementation(async () => {
      state.gallery = [photo('1', { capturedAt: '2026-05-02T00:00:00Z' })]
      return state.gallery[0]
    })

    await wrapper.find('[data-test="photo-gallery"] .action-menu__trigger').trigger('click')
    await wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Editar texto y fecha')!.trigger('click')
    await wrapper.find('[data-test="edit-captured"]').setValue('2026-05-02')
    await wrapper.find('[data-test="photo-edit-dialog"] form').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468/photos/1', { capturedAt: '2026-05-02T00:00:00Z' })
  })

  it('las fotografías de la especie no aparecen: la galería es la del ejemplar', async () => {
    servePhotos([], plantDetail({ species: { ...plantDetail().species, primaryPhoto: { id: '99', altText: 'De la especie', urls: { thumb: '/m/99/thumb', medium: '/m/99/medium', full: '/m/99/full' } }, photoCount: 6 } }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="plant-cover"]').text()).toContain('Sin fotografía')
    expect(wrapper.html()).not.toContain('/media/99')
    expect(api.get.mock.calls.some(([path]: [string]) => path.startsWith('/species') && path.endsWith('/photos'))).toBe(false)
  })

  it('si la galería no llega, la portada y el recuento de la propia ficha siguen valiendo', async () => {
    serve(plantDetail({ photoCount: 5, primaryPhoto: { id: '4', altText: 'Portada del detalle', urls: { thumb: '/media/4/thumb', medium: '/media/4/medium', full: '/media/4/full' } } }))
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation((path: string, params?: Record<string, unknown>) => (
      path.endsWith('/photos') ? Promise.reject(new ApiError(500, 'Error del servidor')) : base(path, params)
    ))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const cover = wrapper.find('[data-test="plant-cover"]')
    expect(cover.find('img').attributes('alt')).toBe('Portada del detalle')
    expect(cover.text()).toContain('5 fotos')
  })

  it('avisa de lo que no llegó a subirse tras el alta y lleva a reintentarlo', async () => {
    servePhotos([])
    api.postForm.mockRejectedValue(new ApiError(500, 'Error del servidor'))
    const { usePendingUploads } = await import('@features/media/composables/usePendingUploads')
    const pending = usePendingUploads()
    await pending.uploadAfterSave({ kind: 'plants', id: '882687672222443468' }, [new File(['x'], 'a.jpg', { type: 'image/jpeg' })])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const notice = wrapper.find('[data-test="pending-photos"]')
    expect(notice.text()).toContain('1 fotografía no se subió')
    await notice.find('[data-test="review-pending"]').trigger('click')
    expect(wrapper.find('[data-test="photo-pending"]').text()).toContain('a.jpg')
    pending.discardAll()
  })
})

/**
 * El riego es una medida de la lectura, no un tipo de evento: la cronología no ofrece «Riego»
 * como filtro propio.
 */
describe('cronología de la ficha: el riego no es un evento', () => {
  it('no ofrece «Riego» como tipo de evento', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const filters = wrapper.findAll('[data-test^="filter-"]').map((node) => node.text())
    expect(filters.some((label) => /riego/i.test(label))).toBe(false)
  })
})

/** Escenarios de «Perfil real del ejemplar en las pantallas»: la ficha con su perfil, estado e historial. */
describe('ficha de la planta: perfil, estado e historial', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.put.mockReset()
    api.post.mockReset()
  })

  const openTab = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>, label: string) => {
    await wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label))!.trigger('click')
    await settle()
  }

  it('la pestaña de datos muestra el perfil real del ejemplar', async () => {
    serve(plantDetail({
      description: 'Ejemplar adulto', germinationYear: 2021, germinationMonth: 4,
      acquiredOn: '2022-03-01', origin: 'intercambio', originNote: 'Con un vecino',
    }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    const data = wrapper.find('.data').text()
    expect(data).toContain('Ejemplar adulto')
    expect(data).toContain('Intercambio')
    expect(data).toContain('Con un vecino')
    expect(data).toContain('04/2021')
    expect(data).toContain('2022')
  })

  it('un perfil vacío no inventa nada: los campos ausentes dicen «Sin indicar»', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    expect(wrapper.find('[data-test="profile-description"]').text()).toContain('Sin indicar')
    expect(wrapper.find('[data-test="profile-germination"]').text()).toContain('Sin indicar')
  })

  it('la pestaña de datos incluye el historial de cambios de estado', async () => {
    serve(plantDetail(), [], [
      { id: '2', fromStatus: 'activa', toStatus: 'cuarentena', reason: 'Cochinilla', occurredAt: '2026-08-01T09:00:00Z' },
    ])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    expect(wrapper.find('[data-test="status-change"]').text()).toContain('Cochinilla')
  })

  it('la pestaña de datos incluye el historial de movimientos', async () => {
    serve(plantDetail(), [], [], [
      { id: '1', plantId: '882687672222443468', plantCode: 'CAT-GRUSS-01', from: { id: '300005', name: 'Cuarentena' }, to: { id: '300001', name: 'Invernadero 1' }, movedAt: '2026-10-06T10:00:00Z' },
    ])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    expect(wrapper.find('[data-test="movement-route"]').text()).toBe('Cuarentena → Invernadero 1')
  })

  it('cambiar el estado desde la cabecera actualiza la ficha y refresca el historial', async () => {
    serve(plantDetail())
    api.put.mockResolvedValue(plantDetail({ status: 'cuarentena' }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await openTab(wrapper, 'Datos')
    const before = api.get.mock.calls.filter(([path]) => String(path).endsWith('/status-changes')).length

    await wrapper.find('[data-test="change-status"]').trigger('click')
    await wrapper.find('[data-test="new-status"]').setValue('cuarentena')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="plant-status"]').text()).toContain('En cuarentena')
    expect(wrapper.find('[data-test="status-form"]').exists()).toBe(false)
    expect(api.get.mock.calls.filter(([path]) => String(path).endsWith('/status-changes')).length).toBe(before + 1)
  })

  it('un cambio rechazado por el API deja el estado como estaba y el diálogo abierto', async () => {
    serve(plantDetail())
    api.put.mockRejectedValue(new ApiError(409, "Desde el estado 'muerta' solo se puede volver a 'activa'"))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await wrapper.find('[data-test="change-status"]').trigger('click')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="status-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="plant-status"]').text()).toContain('Activa')
  })
})

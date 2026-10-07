import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { usePendingUploads } from '@features/media/composables/usePendingUploads'
import SpeciesDetail from '../app/pages/species/[id]/index.vue'
import type { SpeciesDetail as SpeciesRecord } from '@features/species/types/species.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '200001' } }))

/** Escenarios de la requirement «Ficha de una especie». */
describe('ficha de una especie', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    api.postForm.mockReset()
  })

  const care = (overrides: Partial<SpeciesRecord> = {}): SpeciesRecord => ({
    id: '200001',
    code: 'CAT-GRUSS',
    plantCount: 3,
    scientificName: 'Echinocactus grusonii',
    commonName: 'Asiento de suegra',
    minHumidity: 10,
    maxHumidity: 30,
    minTemperature: 10,
    maxTemperature: 35,
    minLightHours: 6,
    maxLightHours: 10,
    wateringGuideline: 'cada 10-20 dias en crecimiento',
    soilMix: { id: '100001', name: 'Sustrato mineral de drenaje rápido' },
    description: null,
    sunExposure: null,
    environment: null,
    bloomDescription: null,
    bloomColor: null,
    bloomMaturity: null,
    bloomTypicalDuration: null,
    periods: [],
    ...overrides,
  })

  /** Escenarios «Código de la especie en el catálogo y en su ficha» y «Recuento real en la ficha». */
  it('muestra el código real de la especie, en la portada y en la ficha de catálogo', async () => {
    api.get.mockResolvedValue(care({ code: 'CAT-GRUSS' }))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="species-code"]').text()).toContain('CAT-GRUSS')
    expect(wrapper.find('[data-test="species-code"]').attributes('data-mock')).toBeUndefined()
    expect(wrapper.find('[data-test="catalog-code"]').text()).toBe('CAT-GRUSS')
  })

  it('el recuento de ejemplares de la ficha es el real, no una maqueta', async () => {
    api.get.mockResolvedValue(care({ plantCount: 3 }))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const count = wrapper.find('[data-test="plant-count"]')
    expect(count.text()).toContain('3')
    expect(count.attributes('data-mock')).toBeUndefined()
  })

  it('una especie sin ejemplares dice cero, no un guion', async () => {
    api.get.mockResolvedValue(care({ plantCount: 0 }))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="plant-count"]').text()).toContain('0')
  })

  it('muestra los dos nombres de la especie', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.text()).toContain('Echinocactus grusonii')
    expect(wrapper.text()).toContain('Asiento de suegra')
  })

  it('muestra la pauta que heredan sus ejemplares: los tres rangos y el riego', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const conditions = wrapper.find('[data-test="conditions"]').text()
    expect(conditions).toContain('10')
    expect(conditions).toContain('30')
    expect(conditions).toContain('35')
    expect(conditions).toContain('cada 10-20 dias en crecimiento')
  })

  /** Dejó de ser maqueta con `catalogo-sustratos`: la ficha la sirve el API. */
  it('muestra la mezcla de sustrato, que es dato real y navega a su ficha', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const link = wrapper.find('[data-test="soil-mix-link"]')
    expect(link.text()).toContain('Sustrato mineral de drenaje rápido')
    expect(link.attributes('href')).toBe('/soil-mixes/100001')
    expect(link.attributes('data-mock')).toBeUndefined()
  })

  it('ofrece corregir y retirar la especie desde su ficha', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="edit-species"]').attributes('href')).toBe('/species/200001/edit')
    expect(wrapper.find('[data-test="remove-species"]').exists()).toBe(true)
  })

  it('cambia entre resumen, cultivo, fotografías y ejemplares sin abandonar la ficha', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()
    const tabs = wrapper.findAll('[role="tab"]')

    expect(tabs.map(item => item.text())).toEqual([
      'Resumen', 'Cultivo', 'Fotografías', 'Ejemplares',
    ])

    await tabs[1]!.trigger('click')
    expect(wrapper.find('[data-test="cultivation-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="specimens"]').exists()).toBe(false)

    await tabs[2]!.trigger('click')
    expect(wrapper.find('[data-test="photos-view"]').exists()).toBe(true)

    await tabs[3]!.trigger('click')
    expect(wrapper.find('[data-test="specimens"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="specimens-toolbar"]').exists()).toBe(true)
  })

  /**
   * La ficha del wireframe es mucho más ancha que lo que el API sirve. Lo que falta se declara con
   * su ticket: una sección inventada y sin marcar es indistinguible de una que funciona.
   */
  it('cada sección que el API no sirve dice qué ticket la llena', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    for (const [test, ticket] of [
      ['specimens', 'T-21'],
      ['groups', 'T-21'],
    ] as const) {
      const section = wrapper.find(`[data-test="${test}"]`)
      expect(section.exists(), `falta la sección ${test}`).toBe(true)
      expect(section.attributes('data-mock'), `${test} no está marcada`).toBe('true')
      expect(section.text(), `${test} no dice su ticket`).toContain(ticket)
    }
  })

  /** Escenario «La pauta se lee de una vez»: es lo que se consulta de una especie. */
  it('presenta la pauta como una sola lectura, con sus cinco magnitudes reales', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const text = wrapper.findAll('[data-test="conditions"] [data-role="condition"]')
      .map((row) => row.text()).join(' | ')

    expect(text).toMatch(/Temperatura.*Humedad.*Luz.*Riego.*Sustrato/s)
  })

  it('cada magnitud real lleva su unidad, no solo su nombre', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const text = wrapper.find('[data-test="conditions"]').text()
    expect(text).toContain('10–35 °C')
    expect(text).toContain('10–30 %')
    expect(text).toContain('6–10 h')
  })

  describe('ficha de cultivo y calendario (T-17)', () => {
    const open = async (overrides: Partial<SpeciesRecord> = {}) => {
      api.get.mockResolvedValue(care(overrides))
      const wrapper = await mountSuspended(SpeciesDetail)
      await settle()
      return wrapper
    }

    it('exposición y entorno reales, con la definición de la exposición, y ya no marcados', async () => {
      const wrapper = await open({ sunExposure: 'pleno_sol', environment: 'exterior' })

      const exposure = wrapper.find('[data-test="exposure"]')
      expect(exposure.text()).toContain('Pleno sol')
      expect(exposure.text()).toContain('Exposición directa prolongada')
      expect(exposure.attributes('data-mock')).toBeUndefined()
      expect(wrapper.find('[data-test="environment"]').text()).toContain('Exterior')
      expect(wrapper.find('[data-test="environment"]').attributes('data-mock')).toBeUndefined()
    })

    it('lo que no está definido se dice «Sin definir», conserva su fila y no cita ningún ticket', async () => {
      const wrapper = await open()

      for (const test of ['exposure', 'environment'] as const) {
        const row = wrapper.find(`[data-test="${test}"]`)
        expect(row.attributes('data-role')).toBe('condition')
        expect(row.text()).toContain('Sin definir')
        expect(row.text()).not.toContain('T-17')
      }
    })

    it('la descripción de la portada es la real, o dice que no la hay', async () => {
      const withText = await open({ description: 'Cactus globular de crecimiento lento' })
      expect(withText.find('[data-test="description"]').text()).toContain('Cactus globular de crecimiento lento')
      expect(withText.find('[data-test="description"]').attributes('data-mock')).toBeUndefined()

      const without = await open()
      expect(without.find('[data-test="description"]').text()).toContain('Sin descripción')
    })

    it('el año de cultivo pinta cuatro filas y un reposo de noviembre a febrero cruza diciembre', async () => {
      const wrapper = await open({
        periods: [
          { id: '1', type: 'crecimiento', startMonth: 3, endMonth: 10, intensity: null, notes: null },
          { id: '2', type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: null },
        ],
      })

      const cycle = wrapper.find('[data-test="year-cycle"]')
      expect(cycle.attributes('data-mock')).toBeUndefined()
      const rows = cycle.findAll('[data-role="year-row"]')
      expect(rows).toHaveLength(4)

      const lit = (row: (typeof rows)[number]) => row.findAll('[data-role="month"]')
        .map((cell, index) => (cell.attributes('data-level') !== '0' ? index + 1 : 0)).filter(Boolean)
      expect(lit(rows[0]!)).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
      expect(lit(rows[1]!)).toEqual([1, 2, 11, 12])
      expect(cycle.find('[data-test="no-calendar"]').exists()).toBe(false)
    })

    it('el crecimiento máximo se pinta sobre el crecimiento con más fuerza', async () => {
      const wrapper = await open({
        periods: [
          { id: '1', type: 'crecimiento', startMonth: 3, endMonth: 6, intensity: null, notes: null },
          { id: '2', type: 'crecimiento_maximo', startMonth: 4, endMonth: 5, intensity: null, notes: null },
        ],
      })

      const growth = wrapper.find('[data-test="year-cycle"]').findAll('[data-role="year-row"]')[0]!
      const levels = growth.findAll('[data-role="month"]').map((cell) => cell.attributes('data-level'))
      expect(levels.slice(2, 6)).toEqual(['1', '2', '2', '1'])
    })

    it('el riego se pinta con su intensidad', async () => {
      const wrapper = await open({
        periods: [
          { id: '1', type: 'riego', startMonth: 3, endMonth: 4, intensity: 'moderado', notes: null },
          { id: '2', type: 'riego', startMonth: 5, endMonth: 5, intensity: 'abundante', notes: null },
        ],
      })

      const watering = wrapper.find('[data-test="year-cycle"]').findAll('[data-role="year-row"]')[3]!
      const levels = watering.findAll('[data-role="month"]').map((cell) => cell.attributes('data-level'))
      expect(levels.slice(2, 5)).toEqual(['2', '2', '3'])
    })

    it('una especie sin calendario muestra la rejilla vacía y lo dice', async () => {
      const wrapper = await open()

      const cycle = wrapper.find('[data-test="year-cycle"]')
      expect(cycle.findAll('[data-role="year-row"]')).toHaveLength(4)
      expect(cycle.find('[data-test="no-calendar"]').text()).toContain('no está definido')
    })

    it('la floración muestra periodo, color, madurez, duración y notas reales', async () => {
      const wrapper = await open({
        bloomColor: 'Amarillo intenso',
        bloomMaturity: 'A partir de 15 años',
        bloomTypicalDuration: '3–5 días por flor',
        bloomDescription: 'Mejora tras un reposo seco',
        periods: [{ id: '3', type: 'floracion', startMonth: 5, endMonth: 7, intensity: null, notes: null }],
      })

      const flowering = wrapper.find('[data-test="flowering"]')
      expect(flowering.attributes('data-mock')).toBeUndefined()
      for (const text of ['Mayo–julio', 'Amarillo intenso', 'A partir de 15 años', '3–5 días por flor', 'Mejora tras un reposo seco']) {
        expect(flowering.text()).toContain(text)
      }
    })

    it('una floración sin datos dice «Sin definir» en cada uno', async () => {
      const wrapper = await open()

      const text = wrapper.find('[data-test="flowering"]').text()
      expect(text.match(/Sin definir/g)).toHaveLength(4)
    })
  })

  /**
   * Escenario «El género se deduce del nombre científico». No es un dato inventado: es la primera
   * palabra del binomio, así que **no se marca**. Marcarlo sería mentir en la otra dirección.
   */
  it('deriva el género del binomio, y no lo marca como ejemplo', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const genus = wrapper.find('[data-test="genus"]')
    expect(genus.text()).toContain('Echinocactus')
    expect(genus.text()).not.toContain('Echinocactus grusonii')
    expect(genus.attributes('data-mock')).toBeUndefined()
  })

  it('un nombre científico de una sola palabra no rompe el género', async () => {
    api.get.mockResolvedValue(care({ scientificName: 'Astrophytum' }))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="genus"]').text()).toContain('Astrophytum')
  })

  it('una especie inexistente se dice, con salida al catálogo y sin pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La especie '200001' no existe"))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('/species')
  })

  it('un fallo que no es un 404 se muestra como error, no como especie inexistente', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })

  /** Escenarios de fotografías de la especie (T-19): portada, pestaña, subida y gestión. */
  describe('fotografías de la especie', () => {
    const photo = (id: string, extra: Record<string, unknown> = {}) => ({
      id, altText: `Foto ${id}`, width: 800, height: 600, contentType: 'image/jpeg',
      capturedAt: null, createdAt: '2026-09-01T10:00:00Z', position: Number(id) - 1, primary: id === '1', credit: null,
      urls: { thumb: `/media/${id}/thumb`, medium: `/media/${id}/medium`, full: `/media/${id}/full` },
      ...extra,
    })
    const pageOf = (content: unknown[]) => ({
      content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 50,
    })

    /** Sirve la ficha y, aparte, la galería: la misma `get` doblada atiende las dos rutas. */
    const open = async (photos: ReturnType<typeof photo>[] = [], overrides: Partial<SpeciesRecord> = {}) => {
      let gallery = photos
      api.get.mockImplementation(async (path: string) => (
        path.endsWith('/photos') ? pageOf(gallery) : care(overrides)
      ))
      const wrapper = await mountSuspended(SpeciesDetail)
      await settle()
      return { wrapper, setGallery: (next: typeof photos) => { gallery = next } }
    }

    const goToPhotos = async (wrapper: Awaited<ReturnType<typeof open>>['wrapper']) => {
      await wrapper.findAll('[role="tab"]')[2]!.trigger('click')
    }

    const FILE = (name = 'a.jpg', type = 'image/jpeg') => new File(['x'], name, { type })

    it('la cabecera muestra la portada real con su texto alternativo y el recuento', async () => {
      const { wrapper } = await open([photo('1'), photo('2'), photo('3')])

      const img = wrapper.find('[data-test="cover"] img')
      expect(img.attributes('src')).toContain('/media/1/medium')
      expect(img.attributes('alt')).toBe('Foto 1')
      expect(wrapper.find('[data-test="cover"]').text()).toContain('3 fotos')
      expect(wrapper.find('[data-test="photos"]').attributes('data-mock')).toBeUndefined()
      expect(wrapper.text()).not.toContain('T-19')
    })

    it('ofrece miniaturas de las siguientes y el botón de añadir lleva a la pestaña', async () => {
      const { wrapper } = await open([photo('1'), photo('2'), photo('3')])

      expect(wrapper.findAll('[data-test="hero-thumb"]')).toHaveLength(2)
      await wrapper.find('[data-test="hero-add-photo"]').trigger('click')
      expect(wrapper.find('[data-test="photos-view"]').exists()).toBe(true)
    })

    it('el recuento de la cabecera es un botón que abre la pestaña de fotografías', async () => {
      const { wrapper } = await open([photo('1')])

      await wrapper.find('[data-test="cover"] button').trigger('click')

      expect(wrapper.find('[data-test="photos-view"]').exists()).toBe(true)
    })

    it('sin fotografías dice «Sin fotografía» y no inventa un recuento', async () => {
      const { wrapper } = await open([])

      expect(wrapper.find('[data-test="cover"]').text()).toContain('Sin fotografía')
      expect(wrapper.find('[data-test="cover"] img').exists()).toBe(false)
      expect(wrapper.find('[data-test="cover"]').text()).not.toMatch(/\d+ fotos?/)
      expect(wrapper.text()).not.toContain('T-19')
    })

    it('la pestaña lista la galería con la principal marcada y el recuento en la pestaña', async () => {
      const { wrapper } = await open([photo('1'), photo('2')])

      expect(wrapper.findAll('[role="tab"]')[2]!.text()).toContain('2')
      await goToPhotos(wrapper)

      const thumbs = wrapper.findAll('[data-test="photo-gallery"] [data-role="thumb"]')
      expect(thumbs).toHaveLength(2)
      expect(thumbs[0]!.attributes('data-primary')).toBe('true')
      expect(thumbs[0]!.text()).toContain('Principal')
    })

    it('una galería vacía lo dice', async () => {
      const { wrapper } = await open([])
      await goToPhotos(wrapper)

      expect(wrapper.find('[data-test="photo-gallery"]').text()).toContain('Todavía no hay fotografías')
    })

    it('subir sube cada archivo y actualiza portada y recuento sin recargar', async () => {
      const { wrapper, setGallery } = await open([])
      await goToPhotos(wrapper)
      api.postForm.mockImplementation(async () => {
        setGallery([photo('1')])
        return [photo('1')]
      })

      wrapper.findComponent({ name: 'UiUploadArea' }).vm.$emit('files', [FILE()])
      await settle()
      await settle()

      const [path, form] = api.postForm.mock.calls[0] as [string, FormData]
      expect(path).toBe('/species/200001/photos')
      expect((form.get('files') as File).name).toBe('a.jpg')
      expect(wrapper.find('[data-test="cover"] img').attributes('src')).toContain('/media/1/medium')
      expect(wrapper.find('[data-test="photo-count"]').text()).toContain('1 fotografía')
    })

    it('rechaza antes de enviar un archivo que no es una imagen admitida y dice el motivo', async () => {
      const { wrapper } = await open([])
      await goToPhotos(wrapper)

      wrapper.findComponent({ name: 'UiUploadArea' }).vm.$emit('files', [FILE('a.gif', 'image/gif')])
      await settle()

      expect(api.postForm).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="photo-gallery"]').text()).toContain('JPEG, PNG o WebP')
    })

    it('la autoría de la subida viaja con los archivos', async () => {
      const { wrapper } = await open([])
      await goToPhotos(wrapper)
      api.postForm.mockResolvedValue([photo('1')])

      await wrapper.find('[data-test="upload-credit"]').setValue('Colección propia')
      wrapper.findComponent({ name: 'UiUploadArea' }).vm.$emit('files', [FILE()])
      await settle()

      const form = api.postForm.mock.calls[0]![1] as FormData
      expect(form.get('credit')).toBe('Colección propia')
    })

    it('elegir la portada llama al API con primary: true y recarga', async () => {
      const { wrapper, setGallery } = await open([photo('1'), photo('2')])
      await goToPhotos(wrapper)
      api.put.mockImplementation(async () => {
        setGallery([photo('1', { primary: false }), photo('2', { primary: true })])
        return photo('2', { primary: true })
      })

      const second = wrapper.findAll('[data-role="thumb"]')[1]!
      await second.find('.action-menu__trigger').trigger('click')
      await wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Hacer principal')!.trigger('click')
      await settle()

      expect(api.put).toHaveBeenCalledWith('/species/200001/photos/2', { primary: true })
      expect(wrapper.find('[data-test="cover"] img').attributes('src')).toContain('/media/2/medium')
    })

    it('corrige el texto alternativo y la autoría', async () => {
      const { wrapper } = await open([photo('1')])
      await goToPhotos(wrapper)
      api.put.mockResolvedValue(photo('1'))

      await wrapper.find('.action-menu__trigger').trigger('click')
      await wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Editar texto y fecha')!.trigger('click')
      await wrapper.find('[data-test="edit-alt"]').setValue('Flor amarilla de mayo')
      await wrapper.find('[data-test="edit-credit"]').setValue('Colección propia')
      await wrapper.find('[data-test="photo-edit-dialog"] form').trigger('submit')
      await settle()

      expect(api.put).toHaveBeenCalledWith('/species/200001/photos/1', {
        altText: 'Flor amarilla de mayo', credit: 'Colección propia',
      })
    })

    it('no deja guardar un texto alternativo vacío', async () => {
      const { wrapper } = await open([photo('1')])
      await goToPhotos(wrapper)

      await wrapper.find('.action-menu__trigger').trigger('click')
      await wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Editar texto y fecha')!.trigger('click')
      await wrapper.find('[data-test="edit-alt"]').setValue('   ')
      await wrapper.find('[data-test="photo-edit-dialog"] form').trigger('submit')

      expect(api.put).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="photo-edit-error"]').exists()).toBe(true)
    })

    it('borrar pide confirmación, dice qué pasa con la portada y recuenta', async () => {
      const { wrapper, setGallery } = await open([photo('1'), photo('2')])
      await goToPhotos(wrapper)
      api.delete.mockImplementation(async () => {
        setGallery([photo('2', { primary: true })])
      })

      await wrapper.find('.action-menu__trigger').trigger('click')
      await wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Borrar')!.trigger('click')

      const dialog = wrapper.find('[data-test="photo-remove-dialog"]')
      expect(dialog.text()).toContain('La siguiente en el orden pasará a ser la principal')
      expect(api.delete).not.toHaveBeenCalled()

      await wrapper.find('[data-test="confirm-photo-remove"]').trigger('click')
      await settle()

      expect(api.delete).toHaveBeenCalledWith('/species/200001/photos/1')
      expect(wrapper.find('[data-test="photo-count"]').text()).toContain('1 fotografía')
      expect(wrapper.find('[data-test="cover"] img').attributes('src')).toContain('/media/2/medium')
    })

    it('reordenar envía la lista entera de identificadores', async () => {
      const { wrapper } = await open([photo('1'), photo('2'), photo('3')])
      await goToPhotos(wrapper)
      api.put.mockResolvedValue([])

      const third = wrapper.findAll('[data-role="thumb"]')[2]!
      await third.find('.action-menu__trigger').trigger('click')
      await wrapper.findAll('[role="menuitem"]').find((item) => item.text() === 'Mover antes')!.trigger('click')
      await settle()

      expect(api.put).toHaveBeenCalledWith('/species/200001/photos/order', { ids: ['1', '3', '2'] })
    })

    it('avisa de lo que no llegó a subirse tras el alta y lleva a reintentarlo', async () => {
      api.postForm.mockRejectedValue(new ApiError(500, 'Error del servidor'))
      const { uploadAfterSave, discardAll } = usePendingUploads()
      await uploadAfterSave({ kind: 'species', id: '200001' }, [FILE()])
      const { wrapper } = await open([])

      const notice = wrapper.find('[data-test="pending-photos"]')
      expect(notice.text()).toContain('1 fotografía no se subió')
      await notice.find('[data-test="review-pending"]').trigger('click')
      expect(wrapper.find('[data-test="photo-pending"]').text()).toContain('a.jpg')

      api.postForm.mockResolvedValue([photo('1')])
      await wrapper.find('[data-test="retry-uploads"]').trigger('click')
      await settle()
      expect(wrapper.find('[data-test="photo-pending"]').exists()).toBe(false)
      discardAll()
    })

    it('un fallo al cargar la galería se dice con reintento y la ficha sigue en pie', async () => {
      let failing = true
      api.get.mockImplementation(async (path: string) => {
        if (path.endsWith('/photos')) {
          if (failing) throw new ApiError(500, 'Error del servidor')
          return pageOf([photo('1')])
        }
        return care()
      })
      const wrapper = await mountSuspended(SpeciesDetail)
      await settle()
      await goToPhotos(wrapper)

      expect(wrapper.find('[data-test="photos-error"]').text()).toContain('Error del servidor')
      expect(wrapper.text()).toContain('Echinocactus grusonii')

      failing = false
      await wrapper.find('[data-test="photos-retry"]').trigger('click')
      await settle()

      expect(wrapper.find('[data-test="photos-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-role="thumb"]')).toHaveLength(1)
    })
  })
})

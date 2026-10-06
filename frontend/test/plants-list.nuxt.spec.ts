import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios "Inventario con plantas", "Inventario vacío", "Inventario con más plantas de las que
 * caben en una página" y "Navegación al detalle".
 */
describe('listado del inventario', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    code: `CAT-GRUSS-${id.padStart(2, '0')}`,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const page = (content: PlantSummary[], overrides: Partial<PageResponse<PlantSummary>> = {}): PageResponse<PlantSummary> => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    pageNumber: 0,
    pageSize: 25,
    ...overrides,
  })

  it('muestra una fila por planta con nickname, especie y localización', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Bola verde'), plant('2', 'Pinchitos')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Bola verde')
    expect(text).toContain('Pinchitos')
    expect(text).toContain('Echinocactus grusonii')
    expect(text).toContain('Invernadero 1')
    expect(wrapper.find('h1').text()).toBe('Plantas 2')
    expect(wrapper.find('[data-test="page-eyebrow"]').text()).toBe('Colección')
    expect(text).toContain('1–2 de 2 resultados')
  })

  it('avisa de que el inventario está vacío en lugar de pintar una tabla en blanco', async () => {
    api.get.mockResolvedValue(page([]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(wrapper.text().toLowerCase()).toContain('no hay ninguna planta')
    expect(wrapper.find('[data-test="plants-table"]').exists()).toBe(false)
  })

  it('ofrece avanzar y retroceder cuando hay más de una página', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Bola verde')], { totalElements: 30, totalPages: 2 }))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const next = wrapper.find('[data-test="next-page"]')
    const previous = wrapper.find('[data-test="previous-page"]')
    expect(next.exists()).toBe(true)
    expect(previous.attributes('disabled')).toBeDefined()

    await next.trigger('click')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', { page: 1 })
  })

  it('enlaza al detalle de cada planta', async () => {
    api.get.mockResolvedValue(page([plant('882687672222443468', 'Bola verde')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const link = wrapper.find('[data-test="plant-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/plants/882687672222443468')
  })
})

/**
 * Escenarios "Ordenar el inventario" y "Criterios de filtrado aplicados" de la requirement
 * "Listado del inventario" (`plant-dashboard`), añadidos por `esqueleto-plantas`.
 */
describe('inventario a escala', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    code: `CAT-GRUSS-${id.padStart(2, '0')}`,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const page = (content: PlantSummary[]) => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    pageNumber: 0,
    pageSize: 25,
  })

  it('ordenar vuelve a pedir al API con ese criterio, y no reordena solo la página visible', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta'), plant('2', 'Alfa')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    api.get.mockClear()
    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ sort: 'nickname,asc' }))
  })

  it('invertir el sentido vuelve a pedirlo', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()
    api.get.mockClear()
    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ sort: 'nickname,desc' }))
  })

  it('muestra los criterios de filtrado aplicados y permite retirarlos', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    // Sin filtros no se ofrece limpiar.
    expect(wrapper.find('[data-test="clear-filters"]').exists()).toBe(false)

    await wrapper.find('[data-test="filter-tag"]').setValue('globular')
    await settle()

    expect(wrapper.find('.filter-chip').text()).toContain('globular')
    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ tag: ['globular'] }))
  })

  it('retirar un criterio lo vuelve a pedir sin él', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-tag"]').setValue('globular')
    await settle()
    api.get.mockClear()
    await wrapper.find('.filter-chip button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.not.objectContaining({ tag: expect.anything() }))
  })
})

/**
 * Las columnas y los filtros del wireframe. Los que el API no soporta existen en la pantalla pero
 * van deshabilitados y marcados: sirven para ver la forma, no para hacer creer que filtran.
 */
describe('inventario: columnas y filtros del wireframe', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    code: `CAT-GRUSS-${id.padStart(2, '0')}`,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  function serve(content: PlantSummary[]) {
    api.get.mockImplementation(async (path: string) => (path === '/locations'
      ? { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      : { content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 }))
  }

  it('muestra las columnas de la pantalla, con el estado real', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    // Las ordenables llevan su indicador de sentido; aquí interesa el nombre de la columna.
    const headers = wrapper.findAll('thead th')
      .map((th) => th.text().replace(/[↕↑↓]/g, '').trim())
      .filter(Boolean)
    // El estado es real desde `ficha-del-ejemplar`: se añade a las del prototipo, que no lo pinta.
    expect(headers).toEqual([
      'Planta', 'Especie', 'Localización', 'Estado', 'Último riego', 'Atención', 'Acciones',
    ])
  })

  it('marca como maqueta las columnas que el API no sirve', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    // Último riego, atención y acciones: se ven, pero no se confunden con un dato.
    expect(wrapper.findAll('tbody [data-mock="true"]').length).toBeGreaterThanOrEqual(3)
  })

  it('permite seleccionar filas y ofrece las acciones masivas', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(false)

    await wrapper.find('tbody input[type="checkbox"]').setValue(true)

    const bar = wrapper.find('[data-role="bulk-actions"]')
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toContain('1')
  })

  it('el filtro de localización sí filtra: el API lo admite desde T-02', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ location: '300001' }))
    expect(wrapper.find('.filter-chip').text()).toContain('Invernadero 1')
  })

  it('los filtros que el API no admite están deshabilitados, no rotos', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    for (const test of ['filter-species']) {
      const field = wrapper.find(`[data-test="${test}"]`)
      expect(field.exists()).toBe(true)
      expect(field.attributes('disabled')).toBeDefined()
    }
  })

  it('reserva los filtros secundarios hasta que se piden', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const tag = wrapper.find('[data-test="filter-tag"]')
    expect((tag.element.parentElement?.parentElement as HTMLElement).style.display).toBe('none')

    await wrapper.find('[data-test="more-filters"]').trigger('click')

    expect((tag.element.parentElement?.parentElement as HTMLElement).style.display).not.toBe('none')
  })

  it('oculta visualmente el encabezado de acciones, pero conserva su nombre accesible', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const actionsHeader = wrapper.findAll('thead th').at(-1)!
    expect(actionsHeader.text()).toBe('Acciones')
    expect(actionsHeader.find('.sr-only').exists()).toBe(true)
  })

  /** Escenario «Código real en el inventario»: el que devuelve el API, sin fabricar nada. */
  it('cada fila muestra el código real de la planta, sin marca de maqueta', async () => {
    const mammillaria = plant('22', 'Dedo de dama')
    mammillaria.code = 'CAT-MAMMI-07'
    mammillaria.species = { id: '200002', code: 'CAT-MAMMI', scientificName: 'Mammillaria elongata', commonName: 'Dedo de dama' }
    serve([mammillaria, plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const codes = wrapper.findAll('tbody code')
    expect(codes.map((code) => code.text())).toEqual(['CAT-MAMMI-07', 'CAT-GRUSS-01'])
    expect(wrapper.find('tbody code').attributes('data-mock')).toBeUndefined()
    expect(wrapper.find('tbody').text()).not.toContain('T-15')
  })

  it('las columnas se pueden ocultar, salvo la identificativa', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="configure-columns"]').trigger('click')
    const picker = wrapper.find('[data-test="columns-picker"]')
    expect(picker.text()).not.toContain('Planta')
    expect(picker.text()).toContain('Especie')
  })
})

/** Escenarios de «Búsqueda por código en el inventario» (`busqueda-por-codigo`). */
describe('inventario: búsqueda por código', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    code: `CAT-GRUSS-${id.padStart(2, '0')}`,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const serve = (content: PlantSummary[]) => api.get.mockImplementation(async (path: string) => (
    path === '/locations'
      ? { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      : { content, totalElements: content.length, totalPages: content.length ? 1 : 0, pageNumber: 0, pageSize: 25 }))

  /** Más que el retardo de la caja: lo que tarda en llegar la petición tras dejar de escribir. */
  const pause = () => new Promise((resolve) => setTimeout(resolve, 400))

  const plantCalls = () => api.get.mock.calls.filter(([path]) => path === '/plants')

  it('la caja de búsqueda está activa y dice que apodo y especie llegan con T-21', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const box = wrapper.find('[data-test="filter-search"]')
    expect(box.attributes('disabled')).toBeUndefined()
    expect(box.attributes('data-mock')).toBeUndefined()
    expect(box.attributes('placeholder')).toContain('T-21')
  })

  it('escribir un código filtra el listado por él y aparece como filtro aplicado', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await pause()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ code: 'gruss', page: 0 }))
    expect(wrapper.find('.filter-chip').text()).toContain('gruss')
  })

  it('escribir varias letras seguidas lanza una sola petición, no una por tecla', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()
    const before = plantCalls().length

    for (const text of ['g', 'gr', 'gru', 'grus', 'gruss']) {
      await wrapper.find('[data-test="filter-search"]').setValue(text)
    }
    await pause()

    expect(plantCalls().length - before).toBe(1)
    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ code: 'gruss' }))
  })

  it('quitar el filtro aplicado devuelve el listado completo y vacía la caja', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()
    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await pause()

    await wrapper.find('.filter-chip button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.not.objectContaining({ code: expect.anything() }))
    expect((wrapper.find('[data-test="filter-search"]').element as HTMLInputElement).value).toBe('')
  })

  it('se combina con el filtro de localización', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await settle()
    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await pause()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ code: 'gruss', location: '300001' }))
  })

  it('sin coincidencias lo explica con el texto buscado y ofrece quitar la búsqueda', async () => {
    serve([])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-search"]').setValue('zzz')
    await pause()

    const none = wrapper.find('[data-test="no-match"]')
    expect(none.exists()).toBe(true)
    expect(none.text()).toContain('zzz')
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)

    await wrapper.find('[data-test="clear-search"]').trigger('click')
    await settle()
    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.not.objectContaining({ code: expect.anything() }))
  })

  it('el inventario vacío sin búsqueda sigue ofreciendo crear la primera planta', async () => {
    serve([])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-match"]').exists()).toBe(false)
  })

  it('la caja se alcanza y se usa con el teclado: es un campo de búsqueda con nombre accesible', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const box = wrapper.find('[data-test="filter-search"]')
    expect(box.attributes('type')).toBe('search')
    expect(box.attributes('aria-label')).toBeTruthy()
  })
})

/** Escenarios de «Perfil real del ejemplar en las pantallas» para el inventario: lo archivado no se mezcla. */
describe('inventario: estado', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const plant = (id: string, status: PlantSummary['status'] = 'activa'): PlantSummary => ({
    id,
    code: `CAT-GRUSS-${id.padStart(2, '0')}`,
    status,
    nickname: `Planta ${id}`,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const serve = (content: PlantSummary[]) => api.get.mockImplementation(async (path: string) => (
    path === '/locations'
      ? { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      : { content, totalElements: content.length, totalPages: content.length ? 1 : 0, pageNumber: 0, pageSize: 25 }))

  const lastPlantsCall = () => api.get.mock.calls.filter(([path]) => path === '/plants').at(-1)![1] as Record<string, unknown>

  it('por defecto no pide ningún estado: el API devuelve solo lo que está en curso', async () => {
    serve([plant('1')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(lastPlantsCall()).not.toHaveProperty('status')
    expect(wrapper.find('[data-test="filter-status"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="filter-status"]').attributes('data-mock')).toBeUndefined()
  })

  it('el filtro ofrece los siete estados y una opción visible para incluir las archivadas', async () => {
    serve([plant('1')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const options = wrapper.findAll('[data-test="filter-status"] option').map((option) => option.attributes('value'))
    expect(options).toEqual(['', 'activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida', 'all'])
    expect(wrapper.find('[data-test="filter-status"] option[value="all"]').text().toLowerCase()).toContain('archivada')
  })

  it('filtrar por un estado lo pide al API y aparece como filtro aplicado', async () => {
    serve([plant('1', 'vendida')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-status"]').setValue('vendida')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ status: ['vendida'], page: 0 })
    expect(wrapper.find('.filter-chip').text()).toContain('Vendida')
  })

  it('incluir las archivadas pide los siete estados', async () => {
    serve([plant('1')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-status"]').setValue('all')
    await settle()

    expect(lastPlantsCall().status).toEqual(['activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida'])
  })

  it('quitar el filtro de estado vuelve al comportamiento por defecto', async () => {
    serve([plant('1', 'vendida')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()
    await wrapper.find('[data-test="filter-status"]').setValue('vendida')
    await settle()

    await wrapper.find('.filter-chip button').trigger('click')
    await settle()

    expect(lastPlantsCall()).not.toHaveProperty('status')
  })

  it('cada fila muestra el estado real del ejemplar', async () => {
    serve([plant('1'), plant('2', 'cuarentena'), plant('3', 'muerta')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const statuses = wrapper.findAll('[data-test="row-status"]').map((cell) => cell.text())
    expect(statuses).toEqual(['Activa', 'En cuarentena', 'Muerta'])
  })

  it('se combina con la búsqueda por código y con la localización', async () => {
    serve([plant('1', 'vendida')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await wrapper.find('[data-test="filter-status"]').setValue('vendida')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ location: '300001', status: ['vendida'] })
  })
})

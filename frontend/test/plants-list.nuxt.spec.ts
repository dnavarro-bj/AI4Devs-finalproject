import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

/**
 * La URL es estado compartido entre tests: una página que siguiera montada reaccionaría a los
 * cambios de la siguiente. Cada test desmonta lo suyo.
 */
enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(wrapper.text().toLowerCase()).toContain('no hay ninguna planta')
    expect(wrapper.find('[data-test="plants-table"]').exists()).toBe(false)
  })

  it('ofrece avanzar y retroceder cuando hay más de una página', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Bola verde')], { totalElements: 30, totalPages: 2 }))
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    api.get.mockClear()
    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ sort: 'nickname,asc' }))
  })

  it('invertir el sentido vuelve a pedirlo', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    // Último riego y acciones: se ven, pero no se confunden con un dato. La atención ya es real.
    expect(wrapper.findAll('tbody [data-mock="true"]').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.find('tbody td [data-mock="true"] small').text()).toContain('T-20')
  })

  it('permite seleccionar filas y ofrece las acciones masivas', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(false)

    await wrapper.find('tbody input[type="checkbox"]').setValue(true)

    const bar = wrapper.find('[data-role="bulk-actions"]')
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toContain('1')
  })

  it('«Crear tarea» de la selección abre el formulario con esas plantas como destino', async () => {
    serve([plant('1', 'Bola verde'), plant('2', 'Pinchitos'), plant('3', 'Bola azul')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const boxes = wrapper.findAll('tbody input[type="checkbox"]')
    await boxes[0]!.setValue(true)
    await boxes[2]!.setValue(true)

    const button = wrapper.find('[data-test="bulk-create-task"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toContain('2')

    await button.trigger('click')
    await settle()
    await settle()

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Nueva tarea')
    expect(dialog.find('[data-test="destination-count"]').text()).toContain('2 plantas')
    expect(dialog.find('[data-test="destination-chosen"]').text()).toContain('Bola verde')
    expect(dialog.find('[data-test="destination-chosen"]').text()).toContain('Bola azul')
    expect(dialog.find('[data-test="destination-chosen"]').text()).not.toContain('Pinchitos')
  })

  it('el filtro de localización sí filtra: el API lo admite desde T-02', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ location: '300001' }))
    expect(wrapper.find('.filter-chip').text()).toContain('Invernadero 1')
  })

  it('reserva los filtros secundarios hasta que se piden', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const tag = wrapper.find('[data-test="filter-tag"]')
    expect((tag.element.parentElement?.parentElement as HTMLElement).style.display).toBe('none')

    await wrapper.find('[data-test="more-filters"]').trigger('click')

    expect((tag.element.parentElement?.parentElement as HTMLElement).style.display).not.toBe('none')
  })

  it('oculta visualmente el encabezado de acciones, pero conserva su nombre accesible', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const codes = wrapper.findAll('tbody code')
    expect(codes.map((code) => code.text())).toEqual(['CAT-MAMMI-07', 'CAT-GRUSS-01'])
    expect(wrapper.find('tbody code').attributes('data-mock')).toBeUndefined()
    expect(wrapper.find('tbody').text()).not.toContain('T-15')
  })

  it('las columnas se pueden ocultar, salvo la identificativa', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="configure-columns"]').trigger('click')
    const picker = wrapper.find('[data-test="columns-picker"]')
    expect(picker.text()).not.toContain('Planta')
    expect(picker.text()).toContain('Especie')
  })
})

/** Escenarios de «Búsqueda por código en el inventario» (`busqueda-por-codigo`), ampliados a apodo y especie por `filtros-y-orden-del-inventario`. */
describe('inventario: búsqueda de texto', () => {
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

  it('la caja de búsqueda está activa y dice que busca por código, apodo o especie', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const box = wrapper.find('[data-test="filter-search"]')
    expect(box.attributes('disabled')).toBeUndefined()
    expect(box.attributes('data-mock')).toBeUndefined()
    expect(box.attributes('placeholder')).toBe('Código, apodo o especie')
    expect(box.attributes('placeholder')).not.toContain('T-21')
  })

  it('escribir un texto filtra el listado por él y aparece como filtro aplicado', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await pause()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ q: 'gruss', page: 0 }))
    expect(wrapper.find('.filter-chip').text()).toContain('gruss')
  })

  it('escribir varias letras seguidas lanza una sola petición, no una por tecla', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()
    const before = plantCalls().length

    for (const text of ['g', 'gr', 'gru', 'grus', 'gruss']) {
      await wrapper.find('[data-test="filter-search"]').setValue(text)
    }
    await pause()

    expect(plantCalls().length - before).toBe(1)
    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ q: 'gruss' }))
  })

  it('quitar el filtro aplicado devuelve el listado completo y vacía la caja', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()
    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await pause()

    await wrapper.find('.filter-chip button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.not.objectContaining({ q: expect.anything() }))
    expect((wrapper.find('[data-test="filter-search"]').element as HTMLInputElement).value).toBe('')
  })

  it('se combina con el filtro de localización', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await settle()
    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await pause()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ q: 'gruss', location: '300001' }))
  })

  it('sin coincidencias lo explica con el texto buscado y ofrece quitar la búsqueda', async () => {
    serve([])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-search"]').setValue('zzz')
    await pause()

    const none = wrapper.find('[data-test="no-match"]')
    expect(none.exists()).toBe(true)
    expect(none.text()).toContain('zzz')
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)

    await wrapper.find('[data-test="clear-search"]').trigger('click')
    await settle()
    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.not.objectContaining({ q: expect.anything() }))
  })

  it('el inventario vacío sin búsqueda sigue ofreciendo crear la primera planta', async () => {
    serve([])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-match"]').exists()).toBe(false)
  })

  it('la caja se alcanza y se usa con el teclado: es un campo de búsqueda con nombre accesible', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
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
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(lastPlantsCall()).not.toHaveProperty('status')
    expect(wrapper.find('[data-test="filter-status"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="filter-status"]').attributes('data-mock')).toBeUndefined()
  })

  it('el filtro ofrece los siete estados y una opción visible para incluir las archivadas', async () => {
    serve([plant('1')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const options = wrapper.findAll('[data-test="filter-status"] option').map((option) => option.attributes('value'))
    expect(options).toEqual(['', 'activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida', 'all'])
    expect(wrapper.find('[data-test="filter-status"] option[value="all"]').text().toLowerCase()).toContain('archivada')
  })

  it('filtrar por un estado lo pide al API y aparece como filtro aplicado', async () => {
    serve([plant('1', 'vendida')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-status"]').setValue('vendida')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ status: ['vendida'], page: 0 })
    expect(wrapper.find('.filter-chip').text()).toContain('Vendida')
  })

  it('incluir las archivadas pide los siete estados', async () => {
    serve([plant('1')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-status"]').setValue('all')
    await settle()

    expect(lastPlantsCall().status).toEqual(['activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida'])
  })

  it('quitar el filtro de estado vuelve al comportamiento por defecto', async () => {
    serve([plant('1', 'vendida')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()
    await wrapper.find('[data-test="filter-status"]').setValue('vendida')
    await settle()

    await wrapper.find('.filter-chip button').trigger('click')
    await settle()

    expect(lastPlantsCall()).not.toHaveProperty('status')
  })

  it('cada fila muestra el estado real del ejemplar', async () => {
    serve([plant('1'), plant('2', 'cuarentena'), plant('3', 'muerta')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const statuses = wrapper.findAll('[data-test="row-status"]').map((cell) => cell.text())
    expect(statuses).toEqual(['Activa', 'En cuarentena', 'Muerta'])
  })

  it('se combina con la búsqueda por código y con la localización', async () => {
    serve([plant('1', 'vendida')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await wrapper.find('[data-test="filter-status"]').setValue('vendida')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ location: '300001', status: ['vendida'] })
  })
})

/**
 * Escenarios de `filtros-y-orden-del-inventario`: especie y características de cultivo como filtros
 * reales, orden por clave pública y lo que todavía no existe, marcado con su ticket.
 */
describe('inventario: filtros de especie y de cultivo, y orden', () => {
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

  const speciesPage = {
    content: [
      { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
      { id: '200002', code: 'CAT-MAMMI', scientificName: 'Mammillaria elongata', commonName: 'Dedo de dama' },
    ],
    totalElements: 2,
    totalPages: 1,
    pageNumber: 0,
    pageSize: 500,
  }

  function serve(content: PlantSummary[], species = speciesPage) {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') {
        return { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      }
      if (path === '/species') return species
      return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, pageNumber: 0, pageSize: 25 }
    })
  }

  const pause = () => new Promise((resolve) => setTimeout(resolve, 400))
  const plantsCalls = () => api.get.mock.calls.filter(([path]) => path === '/plants')
  const lastPlantsCall = () => plantsCalls().at(-1)![1] as Record<string, unknown>

  it('el desplegable de especie ofrece las especies reales y deja de ser maqueta', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const field = wrapper.find('[data-test="filter-species"]')
    expect(field.attributes('disabled')).toBeUndefined()
    expect(field.attributes('data-mock')).toBeUndefined()
    expect(field.findAll('option').map((option) => option.text())).toEqual(
      expect.arrayContaining(['Echinocactus grusonii', 'Mammillaria elongata']),
    )
    expect(api.get).toHaveBeenCalledWith('/species', { page: 0, size: 500, sort: 'scientificName,asc' })
  })

  it('filtrar por especie la pide al API y aparece como criterio con su nombre', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-species"]').setValue('200002')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ species: ['200002'], page: 0 })
    expect(wrapper.find('.filter-chip').text()).toContain('Especie: Mammillaria elongata')
  })

  it('avisa si hay más especies de las que caben en el desplegable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    serve([plant('1', 'Bola verde')], { ...speciesPage, totalElements: 740 })
    await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('740'))
    warn.mockRestore()
  })

  it('«Más filtros» trae exposición y entorno de la especie, además de la etiqueta', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()
    await wrapper.find('[data-test="more-filters"]').trigger('click')

    await wrapper.find('[data-test="filter-exposure"]').setValue('pleno_sol')
    await wrapper.find('[data-test="filter-environment"]').setValue('interior')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ exposure: ['pleno_sol'], environment: ['interior'] })
    const chips = wrapper.findAll('.filter-chip').map((chip) => chip.text())
    expect(chips.some((text) => text.includes('Exposición: Pleno sol'))).toBe(true)
    expect(chips.some((text) => text.includes('Entorno: Interior'))).toBe(true)
  })

  it('buscar por apodo o por especie envía el texto como q', async () => {
    serve([plant('1', 'Asiento de suegra')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-search"]').setValue('suegra')
    await pause()

    expect(lastPlantsCall()).toMatchObject({ q: 'suegra', page: 0 })
    expect(wrapper.find('.filter-chip').text()).toContain('Búsqueda: suegra')
  })

  it('retirar un criterio conserva los demás', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()
    await wrapper.find('[data-test="filter-species"]').setValue('200001')
    await wrapper.find('[data-test="filter-status"]').setValue('cuarentena')
    await settle()

    const species = wrapper.findAll('.filter-chip').find((chip) => chip.text().includes('Especie'))!
    await species.find('button').trigger('click')
    await settle()

    expect(lastPlantsCall()).not.toHaveProperty('species')
    expect(lastPlantsCall()).toMatchObject({ status: ['cuarentena'] })
  })

  it('nada coincide: lo explica con los filtros y ofrece limpiarlos, sin confundirlo con un inventario vacío', async () => {
    serve([])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-species"]').setValue('200002')
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="no-match"]').text()).toContain('filtros')

    await wrapper.find('[data-test="clear-all"]').trigger('click')
    await settle()
    expect(lastPlantsCall()).not.toHaveProperty('species')
  })

  it('ordenar por especie y por localización pide la clave pública al API, sin reordenar en el cliente', async () => {
    serve([plant('1', 'Zeta'), plant('2', 'Alfa')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const header = (name: string) => wrapper.findAll('th button').find((button) => button.text().includes(name))!
    await header('Especie').trigger('click')
    await settle()
    expect(lastPlantsCall()).toMatchObject({ sort: 'species,asc' })

    await header('Especie').trigger('click')
    await settle()
    expect(lastPlantsCall()).toMatchObject({ sort: 'species,desc' })

    await header('Localización').trigger('click')
    await settle()
    expect(lastPlantsCall()).toMatchObject({ sort: 'location,asc' })

    // Se pinta lo que el API devuelve, en su orden.
    expect(wrapper.findAll('tbody [data-test="plant-link"]').map((link) => link.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('Zeta')]),
    )
    expect(wrapper.findAll('tbody tr')[0]!.text()).toContain('Zeta')
  })

  it('el selector de orden ofrece las claves públicas y deja ver, sin poder elegir, las que llegan con otro ticket', async () => {
    serve([plant('1', 'Zeta')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const select = wrapper.find('[data-test="sort-select"]')
    await select.setValue('code,desc')
    await settle()
    expect(lastPlantsCall()).toMatchObject({ sort: 'code,desc' })

    const review = select.findAll('option').find((option) => option.text().includes('Última revisión'))!
    expect(review.text()).toContain('T-20')
    expect(review.attributes('disabled')).toBeDefined()
    const attention = select.findAll('option').find((option) => option.text().includes('atención'))!
    expect(attention.text()).not.toContain('T-23')
    expect(attention.text()).toContain('T-24')
    expect(attention.attributes('disabled')).toBeDefined()
  })
})


describe('atención de cada ejemplar en el inventario', () => {
  const plant = (id: string, nickname: string, attention?: string): PlantSummary => ({
    id,
    code: `CAT-GRUSS-${id.padStart(2, '0')}`,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
    ...(attention ? { attention } : {}),
  }) as PlantSummary

  function serve(content: PlantSummary[]) {
    api.get.mockImplementation(async (path: string) => (path === '/locations'
      ? { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      : { content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 }))
  }

  beforeEach(() => api.get.mockReset())

  it('la severidad más alta abierta se lee en texto y con marca, no solo con color', async () => {
    serve([plant('1', 'Crítica', 'critica'), plant('2', 'Media', 'media'), plant('3', 'Baja', 'baja')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    const cells = wrapper.findAll('[data-test="row-attention"]').map((cell) => cell.text())
    expect(cells).toEqual(['▲ Crítica', '● Media', '○ Baja'])
  })

  it('un ejemplar sin alertas abiertas tiene la celda vacía, sin marca de ejemplo', async () => {
    serve([plant('1', 'Tranquila')])
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    expect(wrapper.find('[data-test="row-attention"]').exists()).toBe(false)
    const row = wrapper.find('[data-test="plants-table"] tbody tr')
    expect(row.text()).not.toContain('T-23')
  })
})

/**
 * Requirements «Acciones por lote en la selección del inventario» y «Diálogo de lote con el alcance
 * declarado» (`plant-dashboard`): lo seleccionado se registra de una vez, y «todo el resultado» es
 * la consulta del inventario, no una lista de identificadores.
 */
describe('acciones por lote del inventario', () => {
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

  /** `total` es el de todos los resultados; `content`, lo que cabe en la página. */
  function serve(content: PlantSummary[], total = content.length) {
    api.get.mockImplementation(async (path: string) => (path === '/locations'
      ? { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      : { content, totalElements: total, totalPages: Math.ceil(total / 25) || 1, pageNumber: 0, pageSize: 25 }))
    api.post.mockImplementation(async (path: string) => (path === '/batches/preview' ? { count: total } : {}))
  }

  const flush = async () => { for (let i = 0; i < 4; i++) await settle() }

  async function openWithRows(content: PlantSummary[], total = content.length, route = '/plants') {
    serve(content, total)
    const wrapper = await mountSuspended(PlantsIndex, { route })
    await flush()
    return wrapper
  }

  const previewCalls = () => api.post.mock.calls.filter(([path]) => path === '/batches/preview')

  it('la barra ofrece las tres acciones de lote y crear tarea, con el número de la selección', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos'), plant('3', 'Bola azul')])

    expect(wrapper.find('[data-test="bulk-reading"]').exists()).toBe(false)
    const boxes = wrapper.findAll('tbody input[type="checkbox"]')
    await boxes[0]!.setValue(true)
    await boxes[2]!.setValue(true)

    expect(wrapper.find('[data-test="bulk-reading"]').text()).toBe('Registrar lectura (2)')
    expect(wrapper.find('[data-test="bulk-intervention"]').text()).toBe('Registrar intervención (2)')
    expect(wrapper.find('[data-test="bulk-comment"]').text()).toBe('Añadir comentario (2)')
    expect(wrapper.find('[data-test="bulk-create-task"]').text()).toContain('2')
  })

  it('«Mover» y «Etiquetar» siguen marcados como no disponibles', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde')])
    await wrapper.find('tbody input[type="checkbox"]').setValue(true)

    const bar = wrapper.find('[data-role="bulk-actions"]')
    const moving = bar.findAll('button').find((button) => button.text() === 'Mover')!
    const tagging = bar.findAll('button').find((button) => button.text() === 'Etiquetar')!
    for (const button of [moving, tagging]) {
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('data-mock')).toBe('true')
    }
  })

  it('registrar una lectura sobre la selección abre el lote con esas plantas y el número del servidor', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos'), plant('3', 'Bola azul')])
    api.post.mockImplementation(async (path: string) => (path === '/batches/preview' ? { count: 2 } : {}))
    const boxes = wrapper.findAll('tbody input[type="checkbox"]')
    await boxes[0]!.setValue(true)
    await boxes[2]!.setValue(true)

    await wrapper.find('[data-test="bulk-reading"]').trigger('click')
    await flush()

    const dialog = wrapper.find('[data-test="batch-dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(previewCalls().at(-1)![1]).toEqual({ scope: { kind: 'plants', plantIds: ['1', '3'] } })
    expect(dialog.find('[data-test="batch-count"]').text()).toContain('Se registrará en 2 plantas')
    expect(dialog.findAll('[data-test="exclude-plant"]')).toHaveLength(2)
  })

  it('con la página entera marcada y más resultados, ofrece seleccionar todo el resultado', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')], 486)

    expect(wrapper.find('[data-test="selection-banner"] button').exists()).toBe(false)
    await wrapper.find('thead input[type="checkbox"]').setValue(true)

    const banner = wrapper.find('[data-test="selection-banner"]')
    expect(banner.text()).toContain('Seleccionadas las 2 de esta página')
    expect(banner.find('button').text()).toBe('Seleccionar los 486 resultados')
  })

  it('sin más resultados que filas no hay aviso', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')])

    await wrapper.find('thead input[type="checkbox"]').setValue(true)

    expect(wrapper.find('[data-test="selection-banner"] button').exists()).toBe(false)
  })

  it('al seleccionar todo el resultado el alcance es la consulta del inventario, no una lista', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')], 486, '/plants?status=cuarentena&q=gruss')
    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await wrapper.find('[data-test="selection-banner"] button').trigger('click')

    expect(wrapper.find('[data-test="bulk-reading"]').text()).toBe('Registrar lectura (486)')

    await wrapper.find('[data-test="bulk-reading"]').trigger('click')
    await flush()

    const scope = (previewCalls().at(-1)![1] as { scope: { kind: string, query: string } }).scope
    expect(scope.kind).toBe('query')
    expect(scope.query).toContain('status=cuarentena')
    expect(scope.query).toContain('q=gruss')
    expect(scope.query).not.toContain('page=')
    const dialog = wrapper.find('[data-test="batch-dialog"]')
    expect(dialog.find('[data-test="batch-count"]').text()).toContain('Se registrará en 486 plantas')
    expect(dialog.find('[data-test="exclude-plant"]').exists()).toBe(false)
  })

  it('«volver a la página» vuelve a la selección de las filas', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')], 486)
    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await wrapper.find('[data-test="selection-banner"] button').trigger('click')

    await wrapper.find('[data-test="selection-banner"] button').trigger('click')

    expect(wrapper.find('[data-test="bulk-reading"]').text()).toBe('Registrar lectura (2)')
  })

  it('crear tarea no admite todo el resultado: una tarea lleva hasta 500 plantas', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')], 486)
    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await wrapper.find('[data-test="selection-banner"] button').trigger('click')

    expect(wrapper.find('[data-test="bulk-create-task"]').attributes('disabled')).toBeDefined()
  })

  it('cambiar un filtro vacía la selección y el aviso', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')], 486)
    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await wrapper.find('[data-test="selection-banner"] button').trigger('click')
    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(true)

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await flush()

    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="selection-banner"] button').exists()).toBe(false)
  })

  it('al terminar un lote la selección se vacía y la tabla se recarga', async () => {
    const wrapper = await openWithRows([plant('1', 'Bola verde'), plant('2', 'Pinchitos')])
    api.post.mockImplementation(async (path: string) => (path === '/batches/preview'
      ? { count: 2 }
      : { id: '9', action: 'comentario', scopeKind: 'plantas', plantCount: 2, occurredAt: '2026-10-07T10:00:00Z' }))
    await wrapper.find('thead input[type="checkbox"]').setValue(true)
    await wrapper.find('[data-test="bulk-comment"]').trigger('click')
    await flush()
    const loads = api.get.mock.calls.filter(([path]) => path === '/plants').length

    await wrapper.find('[data-test="comment-text"]').setValue('movidas por el frío')
    await wrapper.find('[data-test="batch-confirm"]').trigger('click')
    await flush()

    expect(api.post.mock.calls.some(([path]) => path === '/batches')).toBe(true)
    expect(wrapper.find('[data-test="batch-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(false)
    expect(api.get.mock.calls.filter(([path]) => path === '/plants').length).toBeGreaterThan(loads)
  })
})

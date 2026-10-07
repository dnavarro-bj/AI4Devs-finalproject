import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { createApiDouble, settle } from './helpers/apiDouble'
import { detail, movement, plantRow, serveLocation } from './helpers/locationFixtures'
import LocationDetail from '../app/pages/locations/[id]/index.vue'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { ok } from '@shared/types/api.types'
import type { Task } from '@features/tasks/types/task.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300002' }, query: {} }))

/** Escenarios de la requirement «Ficha de una localización». */
describe('ficha de una localización', () => {
  const taskRow = (id: string, patch: Partial<Task> = {}): Task => ({
    id, type: 'riego', title: `Tarea ${id}`, priority: 'normal', status: 'pendiente',
    dueFrom: '2026-10-09', dueTo: '2026-10-09', origin: 'manual',
    target: { kind: 'location', location: { id: '300002', name: 'Bandeja A3', path: 'Bandeja A3' } },
    createdAt: '', updatedAt: '', ...patch,
  })
  const tasksPage = (content: Task[], total = content.length) =>
    ok({ content, totalElements: total, totalPages: 1, pageNumber: 0, pageSize: 5 })

  afterEach(() => vi.restoreAllMocks())

  beforeEach(() => {
    useReferenceDate().value = '2026-10-07'
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(tasksPage([]))
    vi.spyOn(alertsApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 5 }))
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const twoPlants = () => [
    plantRow('400001', 'Asiento de suegra'),
    plantRow('400002', 'Bola blanca', { status: 'cuarentena', location: { id: '300002', name: 'Bancada norte' } }),
  ]

  async function open() {
    const wrapper = await mountSuspended(LocationDetail)
    await settle()
    return wrapper
  }

  describe('ejemplares', () => {
    it('muestra los ejemplares, cada uno navegable a su ficha', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.text()).toContain('Asiento de suegra')
      expect(wrapper.find('[data-test="plant-link"]').attributes('href')).toBe('/plants/400001')
    })

    it('pide los ejemplares con el filtro por localización incluyendo a los descendientes', async () => {
      serveLocation(api, { plants: twoPlants() })
      await open()

      expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ location: '300002', includeDescendants: true }))
    })

    it('cada ejemplar dice su ubicación exacta y su estado real', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.findAll('[data-test="row-location"]').map((cell) => cell.text())).toEqual(['Bandeja A3', 'Bancada norte'])
      const statuses = wrapper.findAll('[data-test="row-status"]')
      expect(statuses.map((cell) => cell.text())).toEqual(['Activa', 'En cuarentena'])
      expect(statuses.every((cell) => cell.attributes('data-mock') === undefined)).toBe(true)
    })

    it('ofrece ver el inventario filtrado, con las sublocalizaciones incluidas', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="filtered-inventory"]').attributes('href'))
        .toBe('/plants?location=300002&includeDescendants=true')
    })

    it('los ejemplares van paginados: cambiar de página pide la siguiente', async () => {
      serveLocation(api, { plants: twoPlants(), plantsPage: { totalPages: 3, totalElements: 62 } })
      const wrapper = await open()
      api.get.mockClear()

      await wrapper.find('[data-test="location-plants"]').element.parentElement!.querySelector<HTMLButtonElement>('nav button[aria-label*="iguiente"], nav button:last-of-type')!.click()
      await settle()

      expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ page: 1 }))
    })

    it('una localización vacía lo dice y ofrece retirarla', async () => {
      serveLocation(api, { detail: detail({ children: [], plantCount: 0, plantCountTotal: 0 }), plants: [] })
      const wrapper = await open()

      expect(wrapper.find('[data-test="no-plants"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="remove-location"]').exists()).toBe(true)
    })

    it('si los ejemplares no llegan, lo dice en su bloque sin tirar la ficha', async () => {
      serveLocation(api)
      const base = api.get.getMockImplementation()!
      api.get.mockImplementation(async (path: string, params: unknown) => {
        if (path === '/plants') throw new ApiError(500, 'No se ha podido completar la operación.')
        return base(path, params)
      })
      const wrapper = await open()

      expect(wrapper.find('[data-test="plants-error"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Bancada norte')
    })
  })

  describe('portada y ruta', () => {
    it('abre con la marca del espacio, su código y su identidad', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const hero = wrapper.find('[data-test="location-hero"]')
      expect(hero.exists(), 'falta la portada del espacio').toBe(true)
      expect(hero.text()).toContain('Bancada norte')
      expect(hero.text()).toContain('Bancada')
      expect(hero.find('[data-test="space-code"]').text()).toContain('LOC-I1-BN')
      expect(hero.find('[data-test="space-code"]').attributes('data-mock'), 'el código ya es real').toBeUndefined()
      expect(hero.text()).toContain('Zona de semisombra')
    })

    it('la ruta completa muestra cada ancestro, navegable', async () => {
      serveLocation(api, {
        detail: detail({ id: '300002', ancestors: [{ id: '300001', name: 'Invernadero 1' }] }),
        plants: twoPlants(),
      })
      const wrapper = await open()

      const path = wrapper.find('[data-test="location-path"]')
      expect(path.text()).toContain('Invernadero 1')
      expect(path.text()).toContain('Bancada norte')
      expect(path.find('[data-test="ancestor-link"]').attributes('href')).toBe('/locations/300001')
      expect(path.attributes('data-mock')).toBeUndefined()
    })

    it('los breadcrumbs reflejan la ruta real: cada ancestro navegable y la localización al final', async () => {
      serveLocation(api, {
        detail: detail({ ancestors: [{ id: '300001', name: 'Invernadero 1' }] }),
        plants: twoPlants(),
      })
      await open()

      expect(useBreadcrumbs().breadcrumbs.value).toEqual([
        { label: 'Localizaciones', to: '/locations' },
        { label: 'Invernadero 1', to: '/locations/300001' },
        { label: 'Bancada norte' },
      ])
    })

    it('una raíz lo dice y sus breadcrumbs no llevan ancestros', async () => {
      serveLocation(api, { detail: detail({ parentId: null, ancestors: [] }), plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="location-path"]').text()).toContain('Raíz del vivero')
      expect(useBreadcrumbs().breadcrumbs.value.map((crumb) => crumb.label)).toEqual(['Localizaciones', 'Bancada norte'])
    })

    it('las acciones: editar la ficha y crear una tarea aquí, que ya funciona', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="edit-location"]').attributes('href')).toBe('/locations/300002/edit')
      const task = wrapper.find('[data-test="create-task"]')
      expect(task.attributes('data-mock')).toBeUndefined()
      expect(task.attributes('disabled')).toBeUndefined()
      expect(task.text()).toContain('Crear tarea aquí')
      expect(task.text()).not.toContain('T-22')
    })

    it('«Crear tarea aquí» abre el formulario con esta localización como destino', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      await wrapper.find('[data-test="create-task"]').trigger('click')
      await settle()
      await settle()

      const dialog = wrapper.find('[data-test="task-dialog"]')
      expect(dialog.text()).toContain('Nueva tarea')
      expect((dialog.find('select[data-test="destination-location"]').element as HTMLSelectElement).value).toBe('300002')
    })
  })

  describe('métricas', () => {
    it('las plantas abren la fila como cifra destacada: el total y cuántas hay directamente aquí', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const metrics = wrapper.find('[data-test="location-metrics"]')
      expect(metrics.exists(), 'falta la fila de métricas').toBe(true)
      expect(metrics.find('[data-test="plant-count"]').text()).toContain('62')
      expect(metrics.find('[data-test="plant-count"]').text()).toContain('4 directamente aquí')
    })

    it('las sublocalizaciones se cuentan y se nombran', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const tile = wrapper.find('[data-test="metric-children"]')
      expect(tile.text()).toContain('2')
      expect(tile.text()).toContain('Bandeja A3')
      expect(tile.attributes('data-mock')).toBeUndefined()
    })

    it('las alertas son una cifra real: cuenta las abiertas del lugar y dice la más grave', async () => {
      serveLocation(api, { plants: twoPlants(), detail: detail({ openAlerts: { count: 3, highestSeverity: 'critica' } }) })
      const wrapper = await open()

      const tile = wrapper.find('[data-test="metric-alerts"]')
      expect(tile.exists(), 'falta la métrica de alertas del prototipo').toBe(true)
      expect(tile.attributes('data-mock')).toBeUndefined()
      expect(tile.text()).toContain('3')
      expect(tile.text()).toContain('Crítica')
      expect(tile.text()).not.toContain('T-23')
      expect(tile.attributes('href')).toBe('/alerts?location=300002')
    })

    it('el bloque lateral lista las alertas más graves y enlaza a la bandeja de la localización', async () => {
      const list = vi.spyOn(alertsApiService, 'list').mockResolvedValue(ok({
        content: [
          { id: '1', source: 'medicion', category: 'temperatura', severity: 'critica', status: 'nueva', reason: 'Temperatura baja', detectedAt: '2026-10-06T00:00:00Z', lastDetectedAt: '2026-10-06T00:00:00Z', occurrences: 2,
            plant: { id: '5', code: 'CAT-FEROC-08', nickname: 'Pelona', speciesName: 'Ferocactus gracilis', locationName: 'B1', locationPath: 'Bancada norte / B1' } },
        ],
        totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 5,
      }) as never)
      serveLocation(api, { plants: twoPlants(), detail: detail({ openAlerts: { count: 1, highestSeverity: 'critica' } }) })
      const wrapper = await open()

      expect(list).toHaveBeenCalledWith(expect.objectContaining({
        location: '300002', includeDescendants: true, status: ['nueva', 'revisada'],
      }))
      const panel = wrapper.find('[data-test="alerts"]')
      expect(panel.text()).toContain('Temperatura baja')
      expect(panel.text()).toContain('CAT-FEROC-08')
      expect(panel.find('[data-test="all-alerts"]').attributes('href')).toBe('/alerts?location=300002')
      expect(panel.attributes('data-mock')).toBeUndefined()
    })

    it('sin alertas abiertas el bloque lo dice y no lleva marca de maqueta', async () => {
      serveLocation(api, { plants: twoPlants(), detail: detail({ openAlerts: { count: 0 } }) })
      const wrapper = await open()

      expect(wrapper.find('[data-test="no-alerts"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="metric-alerts"]').text()).toContain('0')
      expect(wrapper.text()).not.toContain('T-23')
    })

    it('las tareas son una cifra real: cuenta las del lugar, sus sublocalizaciones y sus plantas', async () => {
      const list = vi.spyOn(tasksApiService, 'list').mockResolvedValue(tasksPage([taskRow('1')], 7))
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const tile = wrapper.find('[data-test="metric-tasks"]')
      expect(tile.attributes('data-mock')).toBeUndefined()
      expect(tile.text()).toContain('7')
      expect(tile.text()).not.toContain('T-22')
      expect(list).toHaveBeenCalledWith(expect.objectContaining({
        location: '300002', includeDescendants: true, status: ['pendiente'], today: '2026-10-07',
      }))
    })
  })

  describe('lo que contiene', () => {
    it('«Dentro de» lista las sublocalizaciones con su carga, cada una navegable', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const block = wrapper.find('[data-test="children"]')
      const children = block.findAll('[data-test="child"]')
      expect(children).toHaveLength(2)
      expect(children[0]!.text()).toContain('Bandeja A3')
      expect(children[0]!.text()).toContain('31 plantas')
      expect(children[0]!.find('a').attributes('href')).toBe('/locations/300003')
    })

    it('ofrece añadir dentro: abre el alta con esta localización como padre', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="add-inside"]').attributes('href')).toBe('/locations/new?parent=300002')
    })

    it('sin sublocalizaciones lo dice y sigue ofreciendo añadir dentro', async () => {
      serveLocation(api, { detail: detail({ children: [] }), plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="no-children"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="add-inside"]').exists()).toBe(true)
    })
  })

  describe('características del espacio', () => {
    it('muestra tipo, entorno, exposición, capacidad y notas operativas', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const facts = wrapper.find('[data-test="facts"]')
      expect(facts.text()).toContain('Bancada')
      expect(facts.text()).toContain('Cubierto')
      expect(facts.text()).toContain('Semisombra')
      expect(facts.text()).toContain('250 plantas')
      expect(facts.find('[data-test="operational-notes"]').text()).toContain('Malla de sombreo fija')
      expect(facts.attributes('data-mock')).toBeUndefined()
    })

    it('la ocupación sale de los ejemplares totales sobre la capacidad', async () => {
      serveLocation(api, { detail: detail({ capacity: 250, plantCountTotal: 183 }), plants: twoPlants() })
      const wrapper = await open()

      const occupancy = wrapper.find('[data-test="occupancy"]')
      expect(occupancy.text()).toContain('73%')
      expect(occupancy.text()).toContain('183 de 250')
    })

    it('sin capacidad no se inventa una ocupación', async () => {
      serveLocation(api, { detail: detail({ capacity: null }), plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="occupancy-undefined"]').text()).toContain('Sin capacidad definida')
      expect(wrapper.find('[data-test="occupancy"] [role="progressbar"]').exists()).toBe(false)
    })

    it('lo sin definir se dice «Sin definir», no se omite', async () => {
      serveLocation(api, {
        detail: detail({ locationType: null, environment: null, sunExposure: null, capacity: null, operationalNotes: null }),
        plants: twoPlants(),
      })
      const wrapper = await open()

      expect(wrapper.find('[data-test="facts"]').text().match(/Sin definir/g)).toHaveLength(4)
    })
  })

  describe('movimientos y trabajo', () => {
    it('los últimos movimientos dicen el sentido: recibidos o cedidos, con su origen o destino', async () => {
      serveLocation(api, {
        plants: twoPlants(),
        movements: [
          movement({ id: '1', plantCode: 'CAT-GRUSS-01', from: { id: '300005', name: 'Cuarentena' }, to: { id: '300002', name: 'Bancada norte' } }),
          movement({ id: '2', plantCode: 'CAT-GRUSS-02', from: { id: '300002', name: 'Bancada norte' }, to: { id: '300004', name: 'Bandeja A4' } }),
        ],
      })
      const wrapper = await open()

      const block = wrapper.find('[data-test="movements"]')
      expect(block.attributes('data-mock'), 'los movimientos ya son reales').toBeUndefined()
      const directions = block.findAll('[data-test="movement-direction"]').map((item) => item.text())
      expect(directions).toEqual(['recibida desde Cuarentena', 'cedida a Bandeja A4'])
    })

    it('ofrece el historial completo', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="history-link"]').attributes('href')).toBe('/locations/300002/movements')
    })

    it('sin movimientos lo dice', async () => {
      serveLocation(api, { plants: twoPlants(), movements: [] })
      const wrapper = await open()

      expect(wrapper.find('[data-test="no-movements"]').exists()).toBe(true)
    })

    it('si los movimientos no llegan, lo dice en su bloque sin tirar la ficha', async () => {
      serveLocation(api, { plants: twoPlants() })
      const base = api.get.getMockImplementation()!
      api.get.mockImplementation(async (path: string, params: unknown) => {
        if (path === '/locations/300002/movements') throw new ApiError(500, 'No se ha podido completar la operación.')
        return base(path, params)
      })
      const wrapper = await open()

      expect(wrapper.find('[data-test="movements-error"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Bancada norte')
    })

    it('el próximo trabajo lista las tareas más próximas y enlaza a /tasks filtrada por este lugar', async () => {
      vi.spyOn(tasksApiService, 'list').mockResolvedValue(tasksPage([
        taskRow('1', { title: 'Regar la bandeja' }),
        taskRow('2', { title: 'Revisar raíces', dueFrom: '2026-10-01', dueTo: '2026-10-02' }),
      ]))
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      const tasks = wrapper.find('[data-test="tasks"]')
      expect(tasks.attributes('data-mock')).toBeUndefined()
      expect(tasks.findAll('[data-test="next-work-item"]').map((item) => item.find('strong').text())).toEqual(['Regar la bandeja', 'Revisar raíces'])
      // Una tarea vencida se lee como vencida.
      expect(tasks.findAll('[data-test="next-work-overdue"]')).toHaveLength(1)
      expect(tasks.find('[data-test="all-tasks"]').attributes('href')).toBe('/tasks?location=300002')
    })

    it('sin trabajo pendiente lo dice y ofrece crear una', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="no-tasks"]').text()).toContain('No hay trabajo pendiente')
      expect(wrapper.find('[data-test="create-task-panel"]').exists()).toBe(true)
    })

    it('si el API de tareas falla, la ficha sigue y el panel lo explica', async () => {
      vi.spyOn(tasksApiService, 'list').mockResolvedValue({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'sin servicio' } })
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.find('[data-test="tasks-error"]').text()).toContain('sin servicio')
      expect(wrapper.text()).toContain('Bancada norte')
    })

    it('nada de lo que ya existe sigue marcado con T-18', async () => {
      serveLocation(api, { plants: twoPlants() })
      const wrapper = await open()

      expect(wrapper.text()).not.toContain('T-18')
      expect(wrapper.text()).not.toContain('T-20')
    })
  })

  it('una localización inexistente lo explica y ofrece volver al catálogo', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La localización '300002' no existe"))
    const wrapper = await open()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('un fallo al cargar se muestra, y no deja la ficha en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))
    const wrapper = await open()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })
})
